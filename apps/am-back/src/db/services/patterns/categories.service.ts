import { ApiEntityNames, ApiErrorCodes, DEFAULT_PAGE_SIZE, FIRST_PAGE } from "@ameralds/utils";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { In, Repository } from "typeorm";
import { CommonEntitiesService } from "@am-back/db/service/common-entities.service";
import { DataSourceService } from "../../data-source.service";
import { ModelState } from "../../abstract/abstract.model";
import { CategoriesPaginatedPageDto } from "../../../modules/categories/categories.dto";
import { defaultActiveEntity } from "@am-back/db/service/utils/default.config";
import { CategoryEntity } from "../../entities/patterns/category.entity";
import { LabelLangEntity } from "../../entities/common/label-lang.entity";


@Injectable()
export class CategoriesService {
	private categoriesRepository: Repository<CategoryEntity>;

	/** Подключает репозиторий категорий и сервис локализованных подписей. */
	constructor(
		private dataSource: DataSourceService,
		private commonEntitiesService: CommonEntitiesService,
	) {
		this.categoriesRepository = this.dataSource.getRepository<CategoryEntity>(CategoryEntity);
	}

	/** Создаёт категорию с русской и необязательной английской подписью. */
	public async createCategory(ru: string, en?: string): Promise<CategoryEntity> {
		const label: LabelLangEntity = await this.commonEntitiesService.createLabel(ru, en);
		const category: CategoryEntity = this.categoriesRepository.create();

		category.label = label;

		return this.categoriesRepository.save(category);
	}

	/** Заменяет подпись активной категории, удаляя прежнюю; отсутствующая категория вызывает NOT_EXIST. */
	public async editCategory(id: number, ru: string, en?: string): Promise<CategoryEntity> {
		const category: CategoryEntity = await this.categoriesRepository.findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
			relations: { label: true },
		});

		if (!category) {
			throw new HttpException(
				{
					code: ApiErrorCodes.NOT_EXIST,
					entity: ApiEntityNames.CATEGORY,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		await this.commonEntitiesService.removeLabel(category.label);

		category.label = await this.commonEntitiesService.createLabel(ru, en);

		return this.categoriesRepository.save(category);
	}

	/** Помечает активную категорию неактивной; отсутствующая категория вызывает NOT_EXIST. */
	public async removeCategory(id: number): Promise<CategoryEntity> {
		const category: CategoryEntity = await this.categoriesRepository.findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
		});

		if (!category) {
			throw new HttpException(
				{
					code: ApiErrorCodes.NOT_EXIST,
					entity: ApiEntityNames.CATEGORY,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		category.state = ModelState.INACTIVE;

		return this.categoriesRepository.save(category);
	}

	/**
	 * Возвращает страницу активных категорий с подписями и числом страниц; нумерация начинается с
	 * FIRST_PAGE.
	 */
	public async paginatedCategories(page: number): Promise<CategoriesPaginatedPageDto> {
		const take = DEFAULT_PAGE_SIZE;
		const skip = take * (page - FIRST_PAGE);
		const count: number = Math.ceil((await this.categoriesRepository.count(defaultActiveEntity)) / take);

		const categories: CategoryEntity[] = await this.categoriesRepository
			.find({
				where: defaultActiveEntity.where,
				relations: {
					label: true,
				},
				take,
				skip,
			});

		return {
			page,
			count,
			items: categories,
		};
	}

	/** Загружает активную категорию с подписью по идентификатору; при отсутствии возвращает null. */
	public async getCategory(id: number): Promise<CategoryEntity> {
		return this.categoriesRepository.findOne({
			where: {
				...defaultActiveEntity.where,
				id,
			},
			relations: {
				label: true,
			},
		});
	}

	/** Возвращает активные категории из переданного списка идентификаторов вместе с подписями. */
	public async getCategoriesByIds(ids: number[]): Promise<CategoryEntity[]> {
		return this.categoriesRepository
			.find({
				where: {
					...defaultActiveEntity.where,
					id: In(ids),
				},
				relations: {
					label: true,
				},
			});
	}

	/** Возвращает все активные категории с локализованными подписями. */
	public async getAllCategories(): Promise<CategoryEntity[]> {
		return this.categoriesRepository
			.find({
				where: {
					state: ModelState.ACTIVE,
				},
				relations: { label: true },
			});
	}
}
