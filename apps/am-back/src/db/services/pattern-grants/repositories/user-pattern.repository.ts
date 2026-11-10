import { ModelState } from '@am-back/db/abstract/abstract.model';
import { UserPatternEntity } from '@am-back/db/entities/patterns/pattern-order.entity';
import { PatternSizeEntity } from '@am-back/db/entities/patterns/pattern-size.entity';
import { UserPatternGrantEntity } from '@am-back/db/entities/patterns/user-pattern-grant.entity';
import { Injectable } from '@nestjs/common';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { DataSource, type EntityManager, In, Repository } from 'typeorm';


@Injectable()
export class UserPatternRepository extends Repository<UserPatternEntity> {
    /** Подключает совместимое представление действующих прав для профиля, корзины и скачивания. */
    constructor(source: DataSource) {
        super(UserPatternEntity, source.createEntityManager());
    }

    /** Читает активные права активного пользователя вместе с каталогом; файлы загружает только для скачивания. */
    public findOwned(userId: number, manager?: EntityManager, downloadPatternId?: number): Promise<UserPatternEntity[]> {
        // Проекция обновляется атомарно с журналом; недоступные схемы и пользователи не предоставляют доступ.
        return (manager?.getRepository(UserPatternEntity) ?? this).find({
            where: {
                user: {
                    id: userId,
                    state: ModelState.ACTIVE,
                },
                state: ModelState.ACTIVE,
                pattern: {
                    ...(downloadPatternId === undefined ? {} : { id: downloadPatternId }),
                    state: ModelState.ACTIVE,
                },
            },
            relations: {
                pattern: downloadPatternId === undefined ? true : { color: true },
                sizes: {
                    size: true,
                    pattern: true,
                    ...(downloadPatternId === undefined ? {} : { cbb: true, pdf: true, png: true }),
                },
            },
        });
    }

    /** Пересобирает прежнюю модель владения из объединения оснований; пустая проекция становится неактивной. */
    public async project(userId: number, patternId: number, grants: UserPatternGrantEntity[], manager: EntityManager): Promise<void> {
        // Удалённый каталог уже недоступен через проекцию; исторические ID остаются только в журнале.
        if (!await manager.getRepository(PatternEntity).existsBy({ id: patternId })) {
            return;
        }

        const repository = manager.getRepository(UserPatternEntity);

        // Читаем в том числе неактивные/дублирующиеся legacy-строки, сохраняя их ID и историю вместо удаления.
        const rows = await repository.find({
            where: {
                user: { id: userId },
                pattern: { id: patternId },
            },
            order: { id: 'ASC' },
        });

        const sizeIds = [...new Set(grants
            .flatMap((grant) => grant.patternSizeId === null ? [] : [grant.patternSizeId]))];

        const color = grants
            .some((grant) => grant.rightKey === 'color');

        const primary = rows[0] ?? repository.create({
            user: { id: userId },
            pattern: { id: patternId },
        });

        // Не восстанавливаем удалённые размеры по историческим ID; неактивные существующие сохраняем в проекции.
        primary.sizes = sizeIds.length ? await manager.getRepository(PatternSizeEntity).findBy({
            id: In(sizeIds),
            pattern: { id: patternId },
        }) : [];
        primary.color = color;
        primary.state = primary.sizes.length || color ? ModelState.ACTIVE : ModelState.INACTIVE;
        await repository.save(primary);

        for (const duplicate of rows
            .slice(1)) {
            duplicate.sizes = [];
            duplicate.color = false;
            duplicate.state = ModelState.INACTIVE;
            await repository.save(duplicate);
        }
    }
}
