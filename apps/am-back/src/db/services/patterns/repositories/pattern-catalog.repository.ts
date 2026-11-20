import { ModelState } from '@am-back/db/abstract/abstract.model';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
import type { PatternsPaginatedFilters } from '../patterns-paginated-filters';


type PatternIdRow = {
    id: number | string;
};

@Injectable()
export class PatternCatalogRepository extends Repository<PatternEntity> {
    /** Подключает запросы каталога и купленных схем к общему источнику данных. */
    constructor(source: DataSource) {
        super(PatternEntity, source.createEntityManager());
    }

    /** Считает уникальные доступные схемы по тем же фильтрам, что используются для страницы. */
    public countFiltered(filters: PatternsPaginatedFilters, ownerId?: number): Promise<number> {
        // Подсчёт по идентификатору схемы исключает дубли от размеров, категорий и источников владения.
        return this.getFilteredPatternsQuery(filters, ownerId).getCount();
    }

    /**
     * Выбирает уникальные идентификаторы доступных схем каталога либо покупок по фильтрам с устойчивой сортировкой по дате и id
     * по убыванию.
     */
    public async findPageIds(
        filters: PatternsPaginatedFilters,
        take: number,
        skip: number,
        ownerId?: number,
    ): Promise<number[]> {
        // Ограничиваем страницу уникальных схем до загрузки связей; сортировка по createdAt и id делает порядок устойчивым.
        const rows = await this.getFilteredPatternsQuery(filters, ownerId)
            .select("pattern.id", "id")
            .addSelect("pattern.createdAt", "createdAt")
            .distinct(true)
            .orderBy("pattern.createdAt", "DESC")
            .addOrderBy("pattern.id", "DESC")
            .limit(take)
            .offset(skip)
            .getRawMany<PatternIdRow>();

        return rows
            .map((row: PatternIdRow) => Number(row.id));
    }

    /** Загружает активные схемы для страницы (для покупок допускает скрытые) и восстанавливает порядок переданных идентификаторов. */
    public async findPageByIds(ids: number[], ownerId?: number): Promise<PatternEntity[]> {
        if (!ids.length) {
            return [];
        }

        const patterns = await this
            .find({
                where: {
                    id: In(ids),
                    state: ModelState.ACTIVE,
                    ...(ownerId === undefined ? { hidden: false } : {
                        own: {
                            state: ModelState.ACTIVE,
                            user: {
                                id: ownerId,
                                state: ModelState.ACTIVE,
                            },
                        },
                    }),
                },
                relations: {
                    name: true,
                    description: true,
                    basePrice: true,
                    additionalPrice: true,
                    colorPrice: true,
                    images: true,
                    color: true,
                    sizes: {
                        size: true,
                    },
                },
                order: {
                    images: {
                        index: "ASC",
                    },
                },
                select: {
                    sizes: {
                        id: true,
                    },
                },
                loadRelationIds: {
                    relations: ["categories"],
                },
            });

        const patternsById = new Map(
            patterns
                .map((pattern: PatternEntity) => [pattern.id, pattern]),
        );

        return ids
            .map((id: number) => patternsById.get(id))
            .filter((pattern: PatternEntity | undefined): pattern is PatternEntity => Boolean(pattern));
    }

    /**
     * Строит запрос активных схем каталога либо покупок владельца с фильтрами по категориям, размерам и
     * регистронезависимому тексту названия и описания.
     */
    private getFilteredPatternsQuery(filters: PatternsPaginatedFilters, ownerId?: number): SelectQueryBuilder<PatternEntity> {
        // Начинаем выборку активных схем, присоединяя локализованные названия и описания для
        // текстового поиска.
        const queryBuilder = this
            .createQueryBuilder("pattern")
            .leftJoin("pattern.name", "name")
            .leftJoin("pattern.description", "description")
            .where("pattern.state = :state", {
                state: ModelState.ACTIVE,
            });

        if (ownerId === undefined) {
            queryBuilder.andWhere("pattern.hidden = :hidden", { hidden: false });
        }

        else {
            // Ограничиваем выборку действующими правами текущего активного пользователя; скрытие из каталога не отменяет покупку.
            queryBuilder
                .innerJoin("pattern.own", "ownership", "ownership.state = :ownershipState", {
                    ownershipState: ModelState.ACTIVE,
                })
                .innerJoin("ownership.user", "owner", "owner.id = :ownerId AND owner.state = :ownerState", {
                    ownerId,
                    ownerState: ModelState.ACTIVE,
                });
        }

        if (filters.categories.length) {
            // Оставляем схемы хотя бы из одной выбранной категории через параметризованный список идентификаторов.
            queryBuilder
                .innerJoin("pattern.categories", "categoryFilter")
                .andWhere("categoryFilter.id IN (:...categories)", {
                    categories: filters.categories,
                });
        }

        if (filters.sizes.length) {
            // Фильтруем схемы по выбранным размерам каталога через связи размеров схем.
            queryBuilder
                .innerJoin("pattern.sizes", "sizeFilter")
                .innerJoin("sizeFilter.size", "selectedSize")
                .andWhere("selectedSize.id IN (:...sizes)", {
                    sizes: filters.sizes,
                });
        }

        if (filters.query.trim()) {
            // Объединяем поиск ILIKE по ru/en названия и описания в скобки, сохраняя остальные фильтры через AND.
            queryBuilder.andWhere(
                new Brackets((qb: SelectQueryBuilder<PatternEntity>) => {
                    qb.where("name.ru ILIKE :query", {
                        query: `%${filters.query.trim()}%`,
                    })
                        .orWhere("name.en ILIKE :query")
                        .orWhere("description.ru ILIKE :query")
                        .orWhere("description.en ILIKE :query");
                }),
            );
        }

        return queryBuilder;
    }
}
