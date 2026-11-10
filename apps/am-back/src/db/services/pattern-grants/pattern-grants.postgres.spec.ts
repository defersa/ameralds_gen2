import { ModelState } from '@am-back/db/abstract/abstract.model';
import { PrivateFileEntity } from '@am-back/db/entities/files/file.entity';
import { OrderPatternEntity, UserPatternEntity } from '@am-back/db/entities/patterns/pattern-order.entity';
import { PatternSizeEntity } from '@am-back/db/entities/patterns/pattern-size.entity';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { SizeEntity } from '@am-back/db/entities/patterns/size.entity';
import { UserPatternGrantEntity } from '@am-back/db/entities/patterns/user-pattern-grant.entity';
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { UserEntity, UserRole } from '@am-back/db/entities/user.entity';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource, IsNull } from 'typeorm';
import { UserPatternGrants1794100000000 } from '../../../../database/migrations/1794100000000-user-pattern-grants';
import { UserPatternService } from '../general/user-pattern.service';
import { normalizeUserSelection } from '../order/cart/normalize-user-selection';
import { createOrderPatternSnapshot } from '../order/pricing/order-snapshot';
import { PatternGrantsService } from './pattern-grants.service';
import { PatternGrantRepository } from './repositories/pattern-grant.repository';
import { UserPatternRepository } from './repositories/user-pattern.repository';
import type { RevokePatternGrants } from './types/revoke-pattern-grants';


const databaseUrl = process.env.GRANTS_TEST_DATABASE_URL;
const postgres = databaseUrl ? describe : describe.skip;

postgres('pattern grants migration, effective rights and security on PostgreSQL', () => {
    const database = `ams11_test_${randomUUID().replace(/-/g, '')}`;
    const migration = new UserPatternGrants1794100000000();
    let admin: DataSource;
    let db: DataSource;
    let module: TestingModule;
    let service: PatternGrantsService;
    let purchases: UserPatternService;
    let user: UserEntity;
    let other: UserEntity;
    let actor: UserEntity;
    let pattern: PatternEntity;
    let size: PatternSizeEntity;
    let secondSize: PatternSizeEntity;
    let legacy: UserPatternEntity;
    let inactive: UserPatternEntity;

    beforeAll(async () => {
        admin = await new DataSource({ type: 'postgres', url: databaseUrl }).initialize();
        // Создаём случайную отдельную тестовую БД; исходная БД подключения не изменяется.
        await admin.query(`CREATE DATABASE "${database}"`);

        const url = new URL(databaseUrl);

        url.pathname = `/${database}`;
        db = await new DataSource({
            type: 'postgres',
            url: url.toString(),
            entities: [join(__dirname, '../../entities/**/*.entity.ts')],
            extra: { max: 12 },
        }).initialize();
        module = await Test.createTestingModule({
            providers: [
                PatternGrantRepository,
                UserPatternRepository,
                PatternGrantsService,
                UserPatternService,
                { provide: DataSource, useValue: db },
            ],
        }).compile();
        service = module.get(PatternGrantsService);
        purchases = module.get(UserPatternService);
    }, 30_000);

    beforeEach(async () => {
        // Восстанавливаем только изолированную тестовую БД; затем проверяем реальную миграцию на legacy-данных.
        await db.query('DROP SCHEMA IF EXISTS patterns CASCADE; DROP SCHEMA IF EXISTS users CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE SCHEMA users; CREATE SCHEMA patterns');
        await db.synchronize();
        await db.transaction((manager) => migration.down(manager.queryRunner));
        user = await db.getRepository(UserEntity).save({ email: 'buyer@example.test' });
        other = await db.getRepository(UserEntity).save({ email: 'other@example.test' });
        actor = await db.getRepository(UserEntity).save({ email: 'admin@example.test', role: UserRole.ADMIN });

        const files = await db.getRepository(PrivateFileEntity).save([
            { name: 'color.pdf', path: 'test/color.pdf' },
            { name: 'size.pdf', path: 'test/size.pdf' },
            { name: 'other-size.pdf', path: 'test/other-size.pdf' },
        ]);

        pattern = await db.getRepository(PatternEntity).save({ color: files[0] });
        size = await db.getRepository(PatternSizeEntity).save({
            pattern,
            size: await db.getRepository(SizeEntity).save({ value: 36 }),
            pdf: files[1],
        });
        secondSize = await db.getRepository(PatternSizeEntity).save({
            pattern,
            size: await db.getRepository(SizeEntity).save({ value: 38 }),
            pdf: files[2],
        });
        legacy = await db.getRepository(UserPatternEntity).save({ user, pattern, sizes: [size], color: true });
        inactive = await db.getRepository(UserPatternEntity).save({
            user: other,
            pattern,
            sizes: [secondSize],
            color: true,
            state: ModelState.INACTIVE,
        });
        await db.getRepository(UserPatternEntity).save({ user, pattern: null, sizes: [], color: true });
        await db.transaction((manager) => migration.up(manager.queryRunner));
    }, 30_000);

    afterAll(async () => {
        await module?.close();
        await db?.destroy();

        if (admin?.isInitialized) {
            // Удаляем только созданную этой suite тестовую БД после закрытия подключений.
            await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
            await admin.destroy();
        }
    });

    it('migrates independent legacy size/color rights and preserves inactive history and orphan rows through up/down', async () => {
        const grants = await db.getRepository(UserPatternGrantEntity).find({ order: { id: 'ASC' } });

        expect(grants).toHaveLength(4);
        expect(grants
            .filter((grant) => grant.userId === user.id)
            .map((grant) => grant.rightKey).sort()).toEqual(['color', `size:${size.id}`]);
        expect(grants
            .filter((grant) => grant.legacyPurchaseId === inactive.id)
            .every((grant) => grant.revokedAt !== null && grant.revokeReason === 'legacy_inactive')).toBe(true);
        await expect(purchases.getPurchasedFile(user.id, pattern.id, size.pdf.id)).resolves.toMatchObject({ id: size.pdf.id });
        await expect(purchases.getPurchasedFile(other.id, pattern.id, secondSize.pdf.id)).rejects.toMatchObject({ status: 400 });
        await db.transaction((manager) => migration.down(manager.queryRunner));
        expect(await db.getRepository(UserPatternEntity).count()).toBe(3);
        await db.transaction((manager) => migration.up(manager.queryRunner));
        expect(await db.getRepository(UserPatternGrantEntity).count()).toBe(4);
    });

    it('serializes repeated issuance and keeps both independent sources without duplicate effective sizes', async () => {
        const { order } = await paidOrder(user);

        await Promise.all(Array.from({ length: 4 }, () => db.transaction((manager) => service.grantPaidOrder(user.id, order.id, manager))));
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(2);

        const owned = await purchases.getBoughtSelections(user.id, db.manager);

        expect(owned).toEqual([{ patternId: pattern.id, sizeIds: [size.size.id], color: true }]);
        expect(await db.getRepository(UserPatternEntity).countBy({ user: { id: user.id }, pattern: { id: pattern.id }, state: ModelState.ACTIVE })).toBe(1);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ userId: user.id, revokedAt: IsNull() })).toBe(4);
    });

    it.each(['deleted size', 'deleted pattern', 'reassigned size'] as const)('records snapshot grants after a %s without opening unavailable files', async (target) => {
        const { order, item } = await paidOrder(other);

        if (target === 'deleted size') {
            // Убираем связи удаляемого размера в изолированной БД, сохраняя оплаченный snapshot позиции.
            await db.createQueryBuilder().relation(OrderPatternEntity, 'sizes').of(item.id).remove(size.id);
            // Удаление каталога очищает также прежнее владение; журнал legacy-оснований остаётся неизменным.
            await db.createQueryBuilder().relation(UserPatternEntity, 'sizes').of(legacy.id).remove(size.id);
            await db.getRepository(PatternSizeEntity).delete(size.id);
        }

        if (target === 'deleted pattern') {
            await db.getRepository(PatternEntity).delete(pattern.id);
        }

        if (target === 'reassigned size') {
            const replacement = await db.getRepository(PatternEntity).save({});

            await db.getRepository(PatternSizeEntity).update(size.id, { pattern: replacement });
        }

        await db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager));
        await db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager));

        const grants = await db.getRepository(UserPatternGrantEntity).find({
            where: { orderId: order.id },
            order: { rightKey: 'ASC' },
        });

        expect(grants
            .map((grant) => ({ patternId: grant.patternId, rightKey: grant.rightKey }))).toEqual([
            { patternId: pattern.id, rightKey: 'color' },
            { patternId: pattern.id, rightKey: `size:${size.id}` },
        ]);
        await expect(purchases.getPurchasedFile(other.id, pattern.id, size.pdf.id)).rejects.toMatchObject({ status: 400 });
        await expect(purchases.getPurchasedFile(other.id, pattern.id, pattern.color.id)).rejects.toMatchObject({ status: 400 });
    });

    it('rejects rights absent from the paid snapshot even after the live pattern is deleted', async () => {
        const { order, item } = await paidOrder(other, false);

        await db.getRepository(PatternEntity).delete(pattern.id);

        const source = {
            userId: other.id,
            patternId: pattern.id,
            orderId: order.id,
            orderItemId: item.id,
            sourceType: 'order',
        } satisfies Partial<UserPatternGrantEntity>;

        await expect(db.getRepository(UserPatternGrantEntity).insert({
            ...source,
            rightKey: 'color',
            patternSizeId: null,
        })).rejects.toThrow('Order source does not belong to owner or is not paid');
        await expect(db.getRepository(UserPatternGrantEntity).insert({
            ...source,
            rightKey: `size:${secondSize.id}`,
            patternSizeId: secondSize.id,
        })).rejects.toThrow('Order source does not belong to owner or is not paid');
        await db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager));
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(1);
    });

    it('revokes refunded rights while the owner is inactive and keeps them revoked after account restoration', async () => {
        const { order, item } = await paidOrder(other);

        await db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager));
        await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.REFUNDED });
        await db.getRepository(UserEntity).update(other.id, { state: ModelState.INACTIVE });

        const selected = await db.getRepository(UserPatternGrantEntity).findBy({ orderId: order.id });

        const input = {
            ...refund(order.id, item.id, selected
                .map((grant) => grant.id)),
            userId: other.id,
        };

        await expect(db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager))).rejects.toMatchObject({ status: 400 });
        await expect(db.transaction((manager) => service.revokeSelected(other.id, input, manager))).rejects.toMatchObject({ status: 403 });
        await db.transaction((manager) => service.revokeSelected(actor.id, input, manager));
        await db.transaction((manager) => service.revokeSelected(actor.id, input, manager));
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, revokedAt: IsNull() })).toBe(0);
        await db.getRepository(UserEntity).update(other.id, { state: ModelState.ACTIVE });
        await expect(purchases.getBoughtSelections(other.id, db.manager)).resolves.toEqual([]);
        await expect(purchases.getPurchasedFile(other.id, pattern.id, size.pdf.id)).rejects.toMatchObject({ status: 400 });
        await expect(purchases.getPurchasedFile(other.id, pattern.id, pattern.color.id)).rejects.toMatchObject({ status: 400 });
    });

    it('revokes only one source, preserves other rights and keeps the first revocation audit on retries', async () => {
        const { order, item } = await paidOrder(user);

        await db.transaction((manager) => service.grantPaidOrder(user.id, order.id, manager));
        await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.PARTIALLY_REFUNDED });

        const selected = await db.getRepository(UserPatternGrantEntity).findOneByOrFail({ orderId: order.id, rightKey: `size:${size.id}` });
        const input = refund(order.id, item.id, [selected.id]);

        await db.transaction((manager) => service.revokeSelected(actor.id, input, manager));

        const first = await db.getRepository(UserPatternGrantEntity).findOneByOrFail({ id: selected.id });

        input.reason = 'Повторная обработка';
        input.refundReference = 'another-refund';
        await db.transaction((manager) => service.revokeSelected(actor.id, input, manager));
        expect(await db.getRepository(UserPatternGrantEntity).findOneByOrFail({ id: selected.id })).toEqual(first);
        await expect(purchases.getPurchasedFile(user.id, pattern.id, size.pdf.id)).resolves.toMatchObject({ id: size.pdf.id });
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, rightKey: 'color', revokedAt: IsNull() })).toBe(1);
    });

    it('suspends remaining color after the last size is revoked, permits repurchase and resumes color with a new size', async () => {
        const sizeGrant = await db.getRepository(UserPatternGrantEntity).findOneByOrFail({ legacyPurchaseId: legacy.id, rightKey: `size:${size.id}` });

        await db.transaction((manager) => service.revokeSelected(actor.id, {
            userId: user.id,
            source: { type: 'legacy', purchaseId: legacy.id },
            grantIds: [sizeGrant.id],
            reason: 'Подтверждённый возврат исторической покупки',
            refundReference: 'legacy-refund',
        }, manager));
        await expect(purchases.getPurchasedFile(user.id, pattern.id, pattern.color.id)).rejects.toMatchObject({ status: 400 });

        const owned = await purchases.getBoughtSelections(user.id, db.manager);

        expect(owned).toEqual([{ patternId: pattern.id, sizeIds: [], color: true }]);
        expect(normalizeUserSelection({ pattern: pattern.id, sizes: [size.size.id], color: true, requiresPatternPurchase: false }, owned))
            .toMatchObject({ sizes: [size.size.id], color: false, requiresPatternPurchase: true });

        const { order } = await paidOrder(user, false);

        await db.transaction((manager) => service.grantPaidOrder(user.id, order.id, manager));
        await expect(purchases.getPurchasedFile(user.id, pattern.id, pattern.color.id)).resolves.toMatchObject({ id: pattern.color.id });
    });

    it('removes all effective rights after the final bases are revoked and never resurrects them on repeated issuance', async () => {
        const { order, item } = await paidOrder(other);

        await db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager));
        await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.REFUNDED });

        const selected = await db.getRepository(UserPatternGrantEntity).findBy({ orderId: order.id });
        const input = { ...refund(order.id, item.id, selected
            .map((grant) => grant.id)), userId: other.id };

        await db.transaction((manager) => service.revokeSelected(actor.id, input, manager));
        await expect(purchases.getBoughtSelections(other.id, db.manager)).resolves.toEqual([]);
        await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.PAID });
        await db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager));
        await expect(purchases.getBoughtSelections(other.id, db.manager)).resolves.toEqual([]);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(2);
    });

    it('does not grant unselected sizes or color for size-only orders and supports administrative purchases', async () => {
        const { order } = await paidOrder(other, false, true);

        await db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager));
        await expect(purchases.getPurchasedFile(other.id, pattern.id, size.pdf.id)).resolves.toMatchObject({ id: size.pdf.id });
        await expect(purchases.getPurchasedFile(other.id, pattern.id, secondSize.pdf.id)).rejects.toMatchObject({ status: 400 });
        await expect(purchases.getPurchasedFile(other.id, pattern.id, pattern.color.id)).rejects.toMatchObject({ status: 400 });
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, sourceType: 'admin_order' })).toBe(1);
    });

    it('rejects foreign source orders, grants from other items, inactive users and non-admin revocations atomically', async () => {
        const { order, item } = await paidOrder(user);

        await expect(db.transaction((manager) => service.grantPaidOrder(other.id, order.id, manager))).rejects.toMatchObject({ status: 400 });
        await db.transaction((manager) => service.grantPaidOrder(user.id, order.id, manager));
        await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.PARTIALLY_REFUNDED });

        const selected = await db.getRepository(UserPatternGrantEntity).findOneByOrFail({ orderId: order.id, rightKey: 'color' });
        const input = refund(order.id, item.id, [selected.id]);

        await expect(db.transaction((manager) => service.revokeSelected(other.id, input, manager))).rejects.toMatchObject({ status: 403 });
        await expect(db.transaction((manager) => service.revokeSelected(actor.id, { ...input, source: { type: 'order', orderId: order.id, orderItemId: item.id + 1 } }, manager))).rejects.toMatchObject({ status: 400 });
        expect((await db.getRepository(UserPatternGrantEntity).findOneByOrFail({ id: selected.id })).revokedAt).toBeNull();
        await db.getRepository(UserEntity).update(user.id, { state: ModelState.INACTIVE });
        await expect(purchases.getPurchasedFile(user.id, pattern.id, size.pdf.id)).rejects.toMatchObject({ status: 400 });
        await expect(db.transaction((manager) => service.grantPaidOrder(user.id, order.id, manager))).rejects.toMatchObject({ status: 400 });
    });

    it('rolls back issuance/projection together with payment finalization on a caller failure', async () => {
        const { order } = await paidOrder(other);
        const error = new Error('finalization failed');

        await expect(db.transaction(async (manager) => {
            await service.grantPaidOrder(other.id, order.id, manager);
            throw error;
        })).rejects.toBe(error);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(0);
        await expect(purchases.getBoughtSelections(other.id, db.manager)).resolves.toEqual([]);
    });

    it('protects grant identity/deletion in the database and refuses destructive rollback after new activity', async () => {
        const grant = await db.getRepository(UserPatternGrantEntity).findOneByOrFail({ legacyPurchaseId: legacy.id, rightKey: 'color' });

        await expect(db.getRepository(UserPatternGrantEntity).update(grant.id, { userId: other.id })).rejects.toThrow('immutable');
        await expect(db.getRepository(UserPatternGrantEntity).delete(grant.id)).rejects.toThrow('cannot be deleted');

        const { order } = await paidOrder(user);

        await db.transaction((manager) => service.grantPaidOrder(user.id, order.id, manager));
        await expect(db.transaction((manager) => migration.down(manager.queryRunner))).rejects.toThrow('Cannot rollback');
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(2);
    });

    /** Создаёт серверный оплаченный источник со snapshot; административный вариант моделирует копию завершённого заказа. */
    async function paidOrder(owner: UserEntity, color = true, administrative = false): Promise<{ order: UserOrderEntity; item: OrderPatternEntity }> {
        const source = administrative ? await db.getRepository(AdminOrderEntity).save({ isComplete: true }) : null;

        const order = await db.getRepository(UserOrderEntity).save({
            user: owner,
            status: OrderStatus.PAID,
            paidAt: new Date(),
            sourceAdminOrder: source,
        });

        const item = db.getRepository(OrderPatternEntity).create({
            order,
            pattern,
            sizes: [size],
            color,
            requiresPatternPurchase: true,
        });

        item.snapshot = createOrderPatternSnapshot(item, 'RUB');
        await db.getRepository(OrderPatternEntity).save(item);
        return { order, item };
    }

    /** Формирует область точечного отзыва одной позиции заказа со ссылкой на подтверждённый возврат. */
    function refund(orderId: number, orderItemId: number, grantIds: number[]): RevokePatternGrants {
        return {
            userId: user.id,
            source: { type: 'order', orderId, orderItemId },
            grantIds,
            reason: 'Подтверждённый возврат',
            refundReference: 'refund-1',
        };
    }
});
