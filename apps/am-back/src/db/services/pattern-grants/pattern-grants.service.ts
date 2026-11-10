import { ApiEntityNames, ApiErrorCodes } from '@ameralds/utils';
import { ModelState } from '@am-back/db/abstract/abstract.model';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import type { UserEntity } from '@am-back/db/entities/user.entity';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { PatternGrantRepository } from './repositories/pattern-grant.repository';
import { UserPatternRepository } from './repositories/user-pattern.repository';
import type { RevokePatternGrants } from './types/revoke-pattern-grants';


/** Отклоняет некорректное основание или вызов вне активной транзакции стандартной доменной ошибкой. */
function invalidGrant(): never {
    throw new BadRequestException({
        code: ApiErrorCodes.INVALID,
        entity: ApiEntityNames.PATTERN,
    });
}

@Injectable()
export class PatternGrantsService {
    /** Подключает журнал и совместимую проекцию владения, изменяемые в одной транзакции. */
    constructor(
        private readonly grants: PatternGrantRepository,
        private readonly purchases: UserPatternRepository,
    ) {}

    /**
     * Идемпотентно выдаёт права из snapshot оплаченного заказа владельца; административным legacy-заказам
     * разрешает прежний состав без snapshot. Вызывается после фиксации PAID внутри транзакции финализации.
     * Удаление или изменение каталога не меняет оплаченные основания; доступность файлов проверяется отдельно.
     * Не меняет статус заказа, не подтверждает оплату и не восстанавливает отозванные основания.
     */
    public async grantPaidOrder(userId: number, orderId: number, manager: EntityManager): Promise<void> {
        this.assertTransaction(manager);

        const owner = await this.lockOwner(userId, manager);

        if (owner.state !== ModelState.ACTIVE) {
            invalidGrant();
        }

        const order = await this.grants.lockSourceOrder(userId, orderId, manager);

        if (!order || order.status !== OrderStatus.PAID || !order.paidAt ||
            (order.sourceAdminOrder && (!order.sourceAdminOrder.isComplete || order.sourceAdminOrder.state !== ModelState.ACTIVE))) {
            invalidGrant();
        }

        const patternIds = new Set<number>();

        for (const item of order.patterns ?? []) {
            if (item.state !== ModelState.ACTIVE) {
                continue;
            }

            const snapshot = item.snapshot;

            if (!snapshot && !order.sourceAdminOrder) {
                invalidGrant();
            }

            if (!snapshot && (!item.pattern || item.pattern.state !== ModelState.ACTIVE)) {
                continue;
            }

            const patternId = snapshot?.patternId ?? item.pattern?.id;

            if (patternId === undefined || !Number.isSafeInteger(patternId) || patternId <= 0 ||
                (item.pattern && patternId !== item.pattern.id)) {
                invalidGrant();
            }

            if (!snapshot && (item.sizes ?? [])
                .some((size) => size.pattern?.id !== patternId)) {
                invalidGrant();
            }

            const sizeIds = snapshot ? snapshot.sizes
                .map((size) => size.patternSizeId) : (item.sizes ?? [])
                .filter((size) => size.state === ModelState.ACTIVE)
                .map((size) => size.id);

            if (new Set(sizeIds).size !== sizeIds.length || sizeIds
                .some((id) => !Number.isSafeInteger(id) || id <= 0)) {
                invalidGrant();
            }

            const rights: { rightKey: string; patternSizeId: number | null }[] = sizeIds
                .map((id) => ({
                    rightKey: `size:${id}`,
                    patternSizeId: id,
                }));

            if (snapshot ? snapshot.color : item.color) {
                rights.push({
                    rightKey: 'color',
                    patternSizeId: null,
                });
            }

            for (const right of rights) {
                await this.grants.insertOnce({
                    ...right,
                    userId,
                    patternId,
                    sourceType: order.sourceAdminOrder ? 'admin_order' : 'order',
                    orderId,
                    orderItemId: item.id,
                    legacyPurchaseId: null,
                }, manager);
            }

            patternIds.add(patternId);
        }

        await this.project(userId, patternIds, manager);
    }

    /**
     * Отзывает только выбранные основания одного источника по действующей роли администратора.
     * Для заказа требует REFUNDED/PARTIALLY_REFUNDED и ссылку на подтверждённый возврат; legacy требует
     * явно выбранного исторического основания. Допускает неактивного владельца, чтобы восстановление
     * аккаунта не возвращало отозванный доступ. Финансовые возвраты не выполняет; повтор не меняет аудит.
     */
    public async revokeSelected(actorId: number, input: RevokePatternGrants, manager: EntityManager): Promise<void> {
        this.assertTransaction(manager);

        if (!input.grantIds.length || input.grantIds.length > 500 || input.grantIds
            .some((id) => !Number.isSafeInteger(id) || id <= 0) ||
            typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 2000 ||
            typeof input.refundReference !== 'string' || !input.refundReference.trim() || input.refundReference.length > 255) {
            invalidGrant();
        }

        if (!await this.grants.isAdministrator(actorId, manager)) {
            throw new ForbiddenException();
        }

        await this.lockOwner(input.userId, manager);

        if (input.source.type === 'order') {
            const order = await this.grants.lockSourceOrder(input.userId, input.source.orderId, manager);

            if (!order || (order.status !== OrderStatus.REFUNDED && order.status !== OrderStatus.PARTIALLY_REFUNDED)) {
                invalidGrant();
            }
        }

        const ids = [...new Set(input.grantIds)];
        const selected = await this.grants.findSelected(input.userId, ids, manager);

        if (selected.length !== ids.length || selected
            .some((grant) => input.source.type === 'order'
                ? grant.orderId !== input.source.orderId || grant.orderItemId !== input.source.orderItemId || grant.sourceType === 'legacy'
                : grant.legacyPurchaseId !== input.source.purchaseId || grant.sourceType !== 'legacy')) {
            invalidGrant();
        }

        await this.grants.revokeOnce(ids, actorId, input.reason.trim(), input.refundReference.trim(), manager);
        await this.project(input.userId, new Set(selected
            .map((grant) => grant.patternId)), manager);
    }

    /** Отказывает до запросов к БД, если вызывающий код не передал активную транзакцию. */
    private assertTransaction(manager: EntityManager): void {
        if (!manager.queryRunner?.isTransactionActive) {
            invalidGrant();
        }
    }

    /** Блокирует существующего владельца независимо от активности; отсутствие пользователя возвращает INVALID. */
    private async lockOwner(userId: number, manager: EntityManager): Promise<UserEntity> {
        const owner = await this.grants.lockOwner(userId, manager);

        if (!owner) {
            invalidGrant();
        }

        return owner;
    }

    /** Обновляет проекцию только затронутых схем из всех их действующих оснований в текущей транзакции. */
    private async project(userId: number, patternIds: Set<number>, manager: EntityManager): Promise<void> {
        for (const patternId of patternIds) {
            const effective = await this.grants.findEffective(userId, patternId, manager);

            await this.purchases.project(userId, patternId, effective, manager);
        }
    }
}
