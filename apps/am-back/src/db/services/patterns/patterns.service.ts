import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { In, Repository } from "typeorm";
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
        const color: FileEntity = await this.filesService.getPrivateFile(data.color);
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
        pattern.color = await this.filesService.getPrivateFile(data.color);
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

    public async paginatedPatterns(page: number): Promise<PatternsPaginatedPageDto> {
        const take: number = 10;
        const skip: number = take * (page - 1);
        const count: number = Math.ceil(await this.patternsRepository.count() / take);

        const patterns: PatternEntity[] = await this.patternsRepository.find({
            where: {
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
                createdAt: "DESC"
            },
            select: {
                sizes: {
                    id: true,
                },
            },
            loadRelationIds: { relations: ["categories"] },
            take,
            skip,
        });

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
}
