import { ModelState } from '@am-back/db/abstract/abstract.model';
import { LabelLangEntity } from '@am-back/db/entities/common/label-lang.entity';
import { TextLangEntity } from '@am-back/db/entities/common/text-lang.entity';
import { CategoryEntity } from '@am-back/db/entities/patterns/category.entity';
import { UserPatternEntity } from '@am-back/db/entities/patterns/pattern-order.entity';
import { PatternSizeEntity } from '@am-back/db/entities/patterns/pattern-size.entity';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { SizeEntity } from '@am-back/db/entities/patterns/size.entity';
import { UserEntity } from '@am-back/db/entities/user.entity';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { PatternCatalogRepository } from './pattern-catalog.repository';


const databaseUrl = process.env.PATTERNS_TEST_DATABASE_URL;
const postgres = databaseUrl ? describe : describe.skip;

postgres('purchased patterns filtering on PostgreSQL', () => {
    const database = `patterns_test_${randomUUID().replace(/-/g, '')}`;
    const filters = { sizes: [], categories: [], query: '' };
    let admin: DataSource;
    let db: DataSource;
    let repository: PatternCatalogRepository;
    let owner: UserEntity;
    let other: UserEntity;
    let visible: PatternEntity;
    let hidden: PatternEntity;
    let unowned: PatternEntity;
    let sizes: SizeEntity[];
    let categories: CategoryEntity[];

    beforeAll(async () => {
        admin = await new DataSource({ type: 'postgres', url: databaseUrl }).initialize();
        // Создаём отдельную случайную БД; база из строки подключения служит только для административного подключения.
        await admin.query(`CREATE DATABASE "${database}"`);

        const url = new URL(databaseUrl);

        url.pathname = `/${database}`;
        db = await new DataSource({
            type: 'postgres',
            url: url.toString(),
            entities: [join(__dirname, '../../../entities/**/*.entity.ts')],
        }).initialize();
        repository = new PatternCatalogRepository(db);
    }, 30_000);

    beforeEach(async () => {
        // Пересоздаём схемы исключительно в изолированной тестовой БД перед каждым сценарием.
        await db.query('DROP SCHEMA IF EXISTS patterns CASCADE; DROP SCHEMA IF EXISTS users CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE SCHEMA users; CREATE SCHEMA patterns');
        await db.synchronize();
        owner = await db.getRepository(UserEntity).save({ email: 'owner@example.test' });
        other = await db.getRepository(UserEntity).save({ email: 'other@example.test' });
        sizes = await db.getRepository(SizeEntity).save([{ value: 36 }, { value: 42 }]);
        categories = await db.getRepository(CategoryEntity).save([{}, {}]);
        visible = await createPattern('Волны', false);
        hidden = await createPattern('Скрытая схема', true);
        unowned = await createPattern('Чужая схема', false);
        await db.getRepository(UserPatternEntity).save([
            { user: owner, pattern: visible, sizes: [], color: true },
            { user: owner, pattern: hidden, sizes: [], color: true },
            { user: other, pattern: unowned, sizes: [], color: true },
        ]);
    });

    afterAll(async () => {
        await db?.destroy();

        if (admin?.isInitialized) {
            // Удаляем только созданную этим тестом случайную БД после закрытия всех её соединений.
            await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
            await admin.destroy();
        }
    });

    it('lists only active purchases of the active owner, including hidden patterns', async () => {
        const ids = await repository.findPageIds(filters, 10, 0, owner.id);

        expect(new Set(ids)).toEqual(new Set([visible.id, hidden.id]));
        expect(await repository.countFiltered(filters, owner.id)).toBe(2);
        const patterns = await repository.findPageByIds(ids, owner.id);

        expect(patterns).toHaveLength(2);
        expect(new Set(patterns[0].sizes
            .map(size => size.size.id))).toEqual(new Set(sizes
            .map(size => size.id)));
        expect(patterns[0].categories).toEqual(expect.arrayContaining(categories
            .map(category => category.id)));
        // Публичный каталог сохраняет видимые схемы независимо от покупателя.
        expect(await repository.findPageIds(filters, 10, 0)).toEqual([unowned.id, visible.id]);
    });

    it('uses catalogue OR filters within each group and preserves unique pagination across multiple joins', async () => {
        const selected = {
            sizes: sizes
                .map(size => size.id),
            categories: categories
                .map(category => category.id),
            query: '',
        };

        expect(await repository.countFiltered(selected, owner.id)).toBe(2);
        expect(await repository.findPageIds(selected, 1, 0, owner.id)).toEqual([hidden.id]);
        expect(await repository.findPageIds(selected, 1, 1, owner.id)).toEqual([visible.id]);
        expect(await repository.findPageIds({ ...selected, categories: [999999] }, 10, 0, owner.id)).toEqual([]);
        expect(await repository.findPageIds({ ...selected, sizes: [999999] }, 10, 0, owner.id)).toEqual([]);
    });

    it('searches localized names and descriptions without allowing the search to escape ownership', async () => {
        expect(await repository.findPageIds({ ...filters, query: '  ВОЛНЫ  ' }, 10, 0, owner.id)).toEqual([visible.id]);
        expect(await repository.findPageIds({ ...filters, query: 'WAVES' }, 10, 0, owner.id)).toEqual([hidden.id, visible.id]);
        expect(await repository.findPageIds({ ...filters, query: 'морская' }, 10, 0, owner.id)).toEqual([hidden.id, visible.id]);
        expect(await repository.findPageIds({ ...filters, query: 'Чужая' }, 10, 0, owner.id)).toEqual([]);
    });

    it('removes revoked rights and inactive patterns and denies an inactive owner', async () => {
        await db.getRepository(UserPatternEntity).update({ user: { id: owner.id }, pattern: { id: visible.id } }, { state: ModelState.INACTIVE });
        expect(await repository.findPageIds(filters, 10, 0, owner.id)).toEqual([hidden.id]);
        expect(await repository.findPageByIds([visible.id], owner.id)).toEqual([]);
        await db.getRepository(PatternEntity).update(hidden.id, { state: ModelState.INACTIVE });
        expect(await repository.countFiltered(filters, owner.id)).toBe(0);
        await db.getRepository(UserEntity).update(other.id, { state: ModelState.INACTIVE });
        expect(await repository.findPageIds(filters, 10, 0, other.id)).toEqual([]);
    });

    /** Создаёт схему с несколькими категориями и размерами для проверки уникальности страниц и локализованного поиска. */
    async function createPattern(name: string, isHidden: boolean): Promise<PatternEntity> {
        const label = await db.getRepository(LabelLangEntity).save({ ru: name, en: 'Waves' });
        const description = await db.getRepository(TextLangEntity).save({ ru: 'Морская схема' });

        const pattern = await db.getRepository(PatternEntity).save({
            name: label,
            description,
            hidden: isHidden,
            categories,
        });

        await db.getRepository(PatternSizeEntity).save(sizes
            .map(size => ({ pattern, size })));

        return pattern;
    }
});
