import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Brackets, In, Repository, SelectQueryBuilder } from "typeorm";
import { CommonEntitiesService } from "@am-back/db/service/common-entities.service";
import { ImagesService } from "@am-back/db/service/images.service";
import { FilesService } from "@am-back/db/service/files.service";
import { DataSourceService } from "../../data-source.service";
import { CategoriesService } from "@am-back/db/service/patterns/categories.service";
import { PatternsSizeService } from "@am-back/db/service/patterns/pattern-sizes.service";
import {
    CreatePatternDto,
    PatternEntityDto,
    PatternSizeDto,
    PatternsPaginatedPageDto,
} from "../../../modules/patterns/patterns.dto";
import { ModelState } from "../../abstract/abstract.model";
import { ApiErrorCodes } from "../../../modules/errors/errors.dto";
import { instanceToPlain } from "class-transformer";
import { PatternEntity } from '../../entities/patterns/pattern.entity';
import { LabelLangEntity } from '../../entities/common/label-lang.entity';
import { TextLangEntity } from '../../entities/common/text-lang.entity';
import { NumberLangEntity } from '../../entities/common/number-lang.entity';
import { CategoryEntity } from '../../entities/patterns/category.entity';
import { ImageEntity } from '../../entities/image/image.entity';
import { FileEntity } from '../../entities/files/file.entity';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';



export interface PatternsPaginatedFilters {
    sizes: number[];
    categories: number[];
    query: string;
}

type PatternIdRow = {
    id: number | string;
}

@Injectable()
export class PatternsService {
    private patternsRepository: Repository<PatternEntity>;

    constructor(
        private dataSource: DataSourceService,
        private commonEntitiesService: CommonEntitiesService,
        private categoriesService: CategoriesService,
        private imagesService: ImagesService,
        private filesService: FilesService,
        private patternSizeService: PatternsSizeService,
    ) {
        this.patternsRepository = this.dataSource.getRepository<PatternEntity>(PatternEntity);
    }

    public async createPattern(data: CreatePatternDto): Promise<PatternEntity> {
        const name: LabelLangEntity = await this.commonEntitiesService.createLabel(data.name.ru, data.name.en);
        const description: TextLangEntity = await this.commonEntitiesService.createText(data.description.ru, data.description.en);
        const basePrice: NumberLangEntity = await this.commonEntitiesService.createNumber(data.basePrice.ru, data.basePrice.en);
        const additionalPrice: NumberLangEntity = await this.commonEntitiesService.createNumber(data.additionalPrice.ru, data.additionalPrice.en);
        const colorPrice: NumberLangEntity = await this.commonEntitiesService.createNumber(data.colorPrice.ru, data.colorPrice.en);
        const categories: CategoryEntity[] = await this.categoriesService.getCategoriesByIds(data.categories);
        const images: ImageEntity[] = await this.imagesService.getImagesByIds(data.images);
        const color: FileEntity = data.color ? await this.filesService.getPrivateFile(data.color) : null;
        const sizes: PatternSizeEntity[] = await Promise.all(data.sizes
            .map(async (size: PatternSizeDto) => await this.patternSizeService.createPatternSize(size)));

        await this.imagesService.setUsageStatus(images, true);
        await this.filesService.setUsageStatus(color, true);

        const pattern: PatternEntity = this.patternsRepository.create({
            name,
            description,
            basePrice,
            additionalPrice,
            colorPrice,
            categories,
            hidden: data.hidden ?? false,
            images,
            color,
            sizes,
        });

        await this.imagesService.updateIndex(pattern.images, data.images);
        await this.patternsRepository.save(pattern);

        return pattern;
    }

    public async editPattern(id: number, data: CreatePatternDto): Promise<PatternEntity> {
        const pattern: PatternEntity = await this.patternsRepository.findOne({
            where: {
                id,
                state: ModelState.ACTIVE,
            },
            relations: {
                name: true,
                description: true,
            },
        });

        if (!pattern) {
            throw new HttpException({ code: ApiErrorCodes.NOT_EXIST }, HttpStatus.BAD_REQUEST);
        }

        await Promise.all((pattern.sizes || []).map(async (size: PatternSizeEntity) => await this.patternSizeService.removePatternSize(size)));
        await this.imagesService.setUsageStatus(pattern.images, false);
        await this.filesService.setUsageStatus(pattern.color, false);

        const previousName: LabelLangEntity = pattern.name;
        const previousDescription: LabelLangEntity = pattern.description;
        const previousBasePrice: NumberLangEntity = pattern.basePrice;
        const previousAdditionalPrice: NumberLangEntity = pattern.additionalPrice;
        const previousColorPrice: NumberLangEntity = pattern.colorPrice;

        pattern.name = await this.commonEntitiesService.createLabel(data.name.ru, data.name.en);
        pattern.description = await this.commonEntitiesService.createText(data.description.ru, data.description.en);
        pattern.basePrice = await this.commonEntitiesService.createNumber(data.basePrice.ru, data.basePrice.en);
        pattern.additionalPrice = await this.commonEntitiesService.createNumber(data.additionalPrice.ru, data.additionalPrice.en);
        pattern.colorPrice = await this.commonEntitiesService.createNumber(data.colorPrice.ru, data.colorPrice.en);
        pattern.categories = await this.categoriesService.getCategoriesByIds(data.categories);
        pattern.images = await this.imagesService.getImagesByIds(data.images);
        pattern.color = data.color ? await this.filesService.getPrivateFile(data.color) : null;
        pattern.sizes = await Promise.all((data.sizes || []).map(async (size: PatternSizeDto) => {
            const id: number = size.id;

            return id ? this.patternSizeService.editPatternSize(id, size) : this.patternSizeService.createPatternSize(size);
        }));

        await this.filesService.setUsageStatus(pattern.color, true);
        await this.imagesService.setUsageStatus(pattern.images, true);
        await this.imagesService.updateIndex(pattern.images, data.images);
        await this.patternsRepository.save(pattern);

        await this.commonEntitiesService.removeLabel(previousName);
        await this.commonEntitiesService.removeText(previousDescription);
        await this.commonEntitiesService.removeNumber(previousBasePrice);
        await this.commonEntitiesService.removeNumber(previousAdditionalPrice);
        await this.commonEntitiesService.removeNumber(previousColorPrice);

        return pattern;
    }

    public async paginatedPatterns(page: number, filters: PatternsPaginatedFilters): Promise<PatternsPaginatedPageDto> {
        const take = 10;
        const skip: number = take * (page - 1);
        const [ids, total]: [number[], number] = await Promise.all([
            this.getPaginatedPatternIds(filters, take, skip),
            this.getFilteredPatternsQuery(filters).getCount(),
        ]);
        const patterns: PatternEntity[] = await this.getPatternsPageByIds(ids);
        const count: number = Math.ceil(total / take);

        return {
            page,
            count,
            items: this.processPatterns(patterns),
        };
    }

    public async patternsById(ids: number[]): Promise<Record<number, PatternEntityDto>> {
        const patterns: PatternEntity[] = await this.patternsRepository.find({
            where: {
                id: In(ids),
                state: ModelState.ACTIVE,
                hidden: false,
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

       const plainPatterns: PatternEntityDto[] = this.processPatterns(patterns);

        return Object.fromEntries(plainPatterns.map((item: PatternEntityDto) => [item.id, item]));
    }

    public async getPattern(id: number): Promise<PatternEntity> {
        const pattern: PatternEntity = await this.patternsRepository.findOne({
            where: {
                id,
                state: ModelState.ACTIVE,
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
                    cbb: true,
                    jbb: true,
                    pdf: true,
                    png: true,
                    size: true,
                },
            },
            order: {
                images: {
                    index: "ASC",
                },
            },
            loadRelationIds: { relations: ["categories"] },
        });

        if (!pattern) {
            throw new HttpException({ code: ApiErrorCodes.NOT_EXIST }, HttpStatus.BAD_REQUEST);
        }

        return pattern;
    }

    private processPatterns(patterns: PatternEntity[]): PatternEntityDto[] {
        return patterns
            .map((pattern: PatternEntity) => instanceToPlain(pattern))
            .map((pattern: PatternEntity) =>
                ({
                    ...pattern,
                    sizes: pattern.sizes.map((size: PatternSizeEntity) => ({ ...size, size: size.size.id })),
                })) as unknown as PatternEntityDto[];
    }

    private async getPaginatedPatternIds(filters: PatternsPaginatedFilters, take: number, skip: number): Promise<number[]> {
        const rows: PatternIdRow[] = await this.getFilteredPatternsQuery(filters)
            .select('pattern.id', 'id')
            .addSelect('pattern.createdAt', 'createdAt')
            .distinct(true)
            .orderBy('pattern.createdAt', 'DESC')
            .addOrderBy('pattern.id', 'DESC')
            .limit(take)
            .offset(skip)
            .getRawMany<PatternIdRow>();

        return rows.map((row: PatternIdRow) => Number(row.id));
    }

    private async getPatternsPageByIds(ids: number[]): Promise<PatternEntity[]> {
        if (!ids.length) {
            return [];
        }

        const patterns: PatternEntity[] = await this.patternsRepository.find({
            where: {
                id: In(ids),
                state: ModelState.ACTIVE,
                hidden: false,
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
            loadRelationIds: { relations: ["categories"] },
        });
        const patternsById: Map<number, PatternEntity> = new Map(
            patterns.map((pattern: PatternEntity) => [pattern.id, pattern]),
        );

        return ids
            .map((id: number) => patternsById.get(id))
            .filter((pattern: PatternEntity | undefined): pattern is PatternEntity => Boolean(pattern));
    }

    private getFilteredPatternsQuery(filters: PatternsPaginatedFilters): SelectQueryBuilder<PatternEntity> {
        const queryBuilder: SelectQueryBuilder<PatternEntity> = this.patternsRepository
            .createQueryBuilder('pattern')
            .leftJoin('pattern.name', 'name')
            .leftJoin('pattern.description', 'description')
            .where('pattern.state = :state', { state: ModelState.ACTIVE })
            .andWhere('pattern.hidden = :hidden', { hidden: false });

        if (filters.categories.length) {
            queryBuilder
                .innerJoin('pattern.categories', 'categoryFilter')
                .andWhere('categoryFilter.id IN (:...categories)', { categories: filters.categories });
        }

        if (filters.sizes.length) {
            queryBuilder
                .innerJoin('pattern.sizes', 'sizeFilter')
                .innerJoin('sizeFilter.size', 'selectedSize')
                .andWhere('selectedSize.id IN (:...sizes)', { sizes: filters.sizes });
        }

        if (filters.query.trim()) {
            queryBuilder.andWhere(new Brackets((qb: SelectQueryBuilder<PatternEntity>) => {
                qb.where('name.ru ILIKE :query', { query: `%${filters.query.trim()}%` })
                    .orWhere('name.en ILIKE :query')
                    .orWhere('description.ru ILIKE :query')
                    .orWhere('description.en ILIKE :query');
            }));
        }

        return queryBuilder;
    }
}
