import { ApiErrorCodes, DEFAULT_PAGE_SIZE, FIRST_PAGE, MAX_PAGE_NUMBER, toNumberArray } from "@ameralds/utils";
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
	FullPatternEntityDto,
	PatternEntityDto,
	PatternSizeDto,
	PatternsPaginatedPageDto,
} from "../../../modules/patterns/patterns.dto";
import { ModelState } from "../../abstract/abstract.model";
import { instanceToPlain } from "class-transformer";
import { PatternEntity } from "../../entities/patterns/pattern.entity";
import { LabelLangEntity } from "../../entities/common/label-lang.entity";
import { TextLangEntity } from "../../entities/common/text-lang.entity";
import { NumberLangEntity } from "../../entities/common/number-lang.entity";
import { CategoryEntity } from "../../entities/patterns/category.entity";
import { ImageEntity } from "../../entities/image/image.entity";
import { FileEntity } from "../../entities/files/file.entity";
import { PatternSizeEntity } from "../../entities/patterns/pattern-size.entity";
import { PatternCatalogRepository } from './repositories/pattern-catalog.repository';
import type { PatternsPaginatedFilters } from './patterns-paginated-filters';


@Injectable()
export class PatternsService {
	private patternsRepository: Repository<PatternEntity>;

	/**
	 * Подключает репозитории схем и пагинации, а также сервисы локализованных данных, категорий, изображений,
	 * файлов и размеров.
	 */
	constructor(
		private dataSource: DataSourceService,
		private commonEntitiesService: CommonEntitiesService,
		private categoriesService: CategoriesService,
		private imagesService: ImagesService,
		private filesService: FilesService,
		private patternSizeService: PatternsSizeService,
		private readonly catalog: PatternCatalogRepository,
	) {
		this.patternsRepository = this.dataSource.getRepository<PatternEntity>(PatternEntity);
	}

	/**
	 * Создаёт схему с локализованными описаниями и ценами, категориями, изображениями и размерами; отмечает
	 * файлы используемыми.
	 */
	public async createPattern(data: CreatePatternDto): Promise<PatternEntity> {
		const name: LabelLangEntity = await this.commonEntitiesService.createLabel(data.name.ru, data.name.en);

		const description: TextLangEntity = await this.commonEntitiesService.createText(
			data.description.ru,
			data.description.en,
		);

		const basePrice: NumberLangEntity = await this.commonEntitiesService.createNumber(
			data.basePrice.ru,
			data.basePrice.en,
		);

		const additionalPrice: NumberLangEntity = await this.commonEntitiesService.createNumber(
			data.additionalPrice.ru,
			data.additionalPrice.en,
		);

		const colorPrice: NumberLangEntity = await this.commonEntitiesService.createNumber(
			data.colorPrice.ru,
			data.colorPrice.en,
		);

		const categories: CategoryEntity[] = await this.categoriesService.getCategoriesByIds(data.categories);
		const images: ImageEntity[] = await this.imagesService.getImagesByIds(data.images);
		const color: FileEntity = data.color ? await this.filesService.getPrivateFile(data.color) : null;

		const sizes: PatternSizeEntity[] = await Promise.all(
			data.sizes
				.map(async (size: PatternSizeDto) => await this.patternSizeService.createPatternSize(size)),
		);

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

	/**
	 * Возвращает карточку по контракту API: файлы размеров представлены ID либо null, а приватные пути
	 * не раскрываются. Категории уже загружены как ID; отсутствие схемы приводит к NOT_EXIST.
	 */
	public async getPatternDetails(id: number): Promise<FullPatternEntityDto> {
		const pattern = await this.getPattern(id);

		return {
			id: pattern.id,
			name: {
				ru: pattern.name?.ru,
				en: pattern.name?.en,
			},
			description: {
				ru: pattern.description?.ru,
				en: pattern.description?.en,
			},
			basePrice: {
				ru: pattern.basePrice?.ru,
				en: pattern.basePrice?.en,
			},
			additionalPrice: {
				ru: pattern.additionalPrice?.ru,
				en: pattern.additionalPrice?.en,
			},
			colorPrice: {
				ru: pattern.colorPrice?.ru,
				en: pattern.colorPrice?.en,
			},
			hidden: pattern.hidden,
			categories: toNumberArray(pattern.categories),
			images: pattern.images
				.map((image) => ({
					id: image.id,
					name: image.name,
					preview: image.preview,
					full: image.full,
				})),
			color: pattern.color?.state === ModelState.ACTIVE ? {
				id: pattern.color.id,
				name: pattern.color.name,
				path: '',
			} : null,
			sizes: pattern.sizes
				.filter((size) => size.state === ModelState.ACTIVE && size.size?.state === ModelState.ACTIVE)
				.map((size) => ({
					id: size.id,
					size: size.size ? {
						id: size.size.id,
						value: size.size.value,
						createdAt: size.size.createdAt,
					} : null,
					cbb: size.cbb?.state === ModelState.ACTIVE ? size.cbb.id : null,
					pdf: size.pdf?.state === ModelState.ACTIVE ? size.pdf.id : null,
					png: size.png?.state === ModelState.ACTIVE ? size.png.id : null,
				})),
		};
	}

	/**
	 * Обновляет активную схему и связанные данные, освобождая прежние файлы и локализованные записи; при
	 * отсутствии схемы возвращает NOT_EXIST.
	 */
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
			throw new HttpException(
				{
					code: ApiErrorCodes.NOT_EXIST,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		await Promise.all(
			(pattern.sizes || [])
				.map(
					async (size: PatternSizeEntity) => await this.patternSizeService.removePatternSize(size),
				),
		);
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
		pattern.additionalPrice = await this.commonEntitiesService.createNumber(
			data.additionalPrice.ru,
			data.additionalPrice.en,
		);
		pattern.colorPrice = await this.commonEntitiesService.createNumber(data.colorPrice.ru, data.colorPrice.en);
		pattern.categories = await this.categoriesService.getCategoriesByIds(data.categories);
		pattern.images = await this.imagesService.getImagesByIds(data.images);
		pattern.color = data.color ? await this.filesService.getPrivateFile(data.color) : null;
		pattern.sizes = await Promise.all(
			(data.sizes || [])
				.map(async (size: PatternSizeDto) => {
					const id: number = size.id;

					return id
						? this.patternSizeService.editPatternSize(id, size)
						: this.patternSizeService.createPatternSize(size);
				}),
		);

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

	/**
	 * Возвращает страницу каталога либо действующих покупок ownerId по общим фильтрам без дублей от связей.
	 * Некорректная страница отклоняется с BAD_REQUEST до обращения к базе.
	 */
	public async paginatedPatterns(page: number, filters: PatternsPaginatedFilters, ownerId?: number): Promise<PatternsPaginatedPageDto> {
		if (!Number.isSafeInteger(page) || page < FIRST_PAGE || page > MAX_PAGE_NUMBER) {
			throw new HttpException({ code: ApiErrorCodes.INVALID }, HttpStatus.BAD_REQUEST);
		}

		const take = DEFAULT_PAGE_SIZE;
		const skip = take * (page - FIRST_PAGE);

		// Выбираем идентификаторы страницы и общее количество по одним фильтрам; связи каталога не должны искажать пагинацию.
		const [ids, total]: [number[], number] = await Promise.all([
			this.catalog.findPageIds(filters, take, skip, ownerId),
			this.catalog.countFiltered(filters, ownerId),
		]);

		const patterns: PatternEntity[] = await this.catalog.findPageByIds(ids, ownerId);
		const count: number = Math.ceil(total / take);

		return {
			page,
			count,
			items: this.processPatterns(patterns),
		};
	}

	/**
	 * Возвращает словарь активных нескрытых схем по идентификаторам с данными для представления и расчёта
	 * цены.
	 */
	public async patternsById(ids: number[]): Promise<Record<number, PatternEntityDto>> {
		const patterns: PatternEntity[] = await this.patternsRepository
			.find({
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

		return Object.fromEntries(plainPatterns
			.map((item: PatternEntityDto) => [item.id, item]));
	}

	/**
	 * Загружает активную схему со связанными ценами, изображениями, размерами и файлами; при отсутствии
	 * возвращает NOT_EXIST.
	 */
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
			loadRelationIds: {
				relations: ["categories"],
			},
		});

		if (!pattern) {
			throw new HttpException(
				{
					code: ApiErrorCodes.NOT_EXIST,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		return pattern;
	}

	/**
	 * Преобразует сущности схем в представление API и заменяет вложенную сущность размера его
	 * идентификатором.
	 */
	private processPatterns(patterns: PatternEntity[]): PatternEntityDto[] {
		return patterns
			.map((pattern: PatternEntity) => instanceToPlain(pattern))
			.map((pattern: PatternEntity) => ({
				...pattern,
				sizes: pattern.sizes
					.map((size: PatternSizeEntity) => ({
						...size,
						size: size.size.id,
					})),
			})) as unknown as PatternEntityDto[];
	}

}
