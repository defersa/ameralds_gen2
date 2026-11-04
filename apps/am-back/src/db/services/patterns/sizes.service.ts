import { ApiEntityNames, ApiErrorCodes, DEFAULT_PAGE_SIZE, FIRST_PAGE } from "@ameralds/utils";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../../data-source.service";
import { ModelState } from "../../abstract/abstract.model";
import { SizesPaginatedPageDto } from "../../../modules/sizes/sizes.dto";
import { defaultActiveEntity } from "@am-back/db/service/utils/default.config";
import { SizeEntity } from "../../entities/patterns/size.entity";


@Injectable()
export class SizesService {
	private sizesRepository: Repository<SizeEntity>;

	/** Подключает репозиторий размеров каталога. */
	constructor(private dataSource: DataSourceService) {
		this.sizesRepository = this.dataSource.getRepository<SizeEntity>(SizeEntity);
	}

	/** Создаёт размер после проверки уникальности среди активных размеров. */
	public async createSize(value: number): Promise<SizeEntity> {
		await this.checkUnique(value);

		const size: SizeEntity = this.sizesRepository.create({ value });

		return this.sizesRepository.save(size);
	}

	/** Проверяет уникальность значения и обновляет активный размер; при отсутствии размера возвращает null. */
	public async editSize(id: number, value: number): Promise<SizeEntity> {
		await this.checkUnique(value);

		const size: SizeEntity = await this.sizesRepository.findOne({
			where: {
				id,
				...defaultActiveEntity.where,
			},
		});

		if (!size) {
			return null;
		}

		size.value = value;

		return this.sizesRepository.save(size);
	}

	/** Помечает активный размер неактивным; при отсутствии возвращает null. */
	public async removeSize(id: number): Promise<SizeEntity> {
		const size: SizeEntity = await this.sizesRepository.findOne({
			where: {
				id,
				...defaultActiveEntity.where,
			},
		});

		if (!size) {
			return null;
		}

		size.state = ModelState.INACTIVE;

		return this.sizesRepository.save(size);
	}

	/** Возвращает страницу активных размеров и общее число страниц. */
	public async paginatedSizes(page: number): Promise<SizesPaginatedPageDto> {
		const take = DEFAULT_PAGE_SIZE;
		const skip = take * (page - FIRST_PAGE);
		const count: number = Math.ceil((await this.sizesRepository.count(defaultActiveEntity)) / take);

		const sizes: SizeEntity[] = await this.sizesRepository
			.find({
				where: defaultActiveEntity.where,
				take,
				skip,
			});

		return {
			page,
			count,
			items: sizes,
		};
	}

	/** Возвращает активный размер по идентификатору; при отсутствии возвращает NOT_EXIST для размера. */
	public async getSize(id: number): Promise<SizeEntity> {
		const size: SizeEntity = await this.sizesRepository.findOne({
			where: {
				id,
				...defaultActiveEntity.where,
			},
		});

		if (!size) {
			throw new HttpException(
				{
					code: ApiErrorCodes.NOT_EXIST,
					entity: ApiEntityNames.SIZE,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		return size;
	}

	/** Возвращает все активные размеры по возрастанию значения. */
	public async getAllSizes(): Promise<SizeEntity[]> {
		return this.sizesRepository
			.find({
				where: defaultActiveEntity.where,
				order: {
					value: "ASC",
				},
			});
	}

	/** Отклоняет значение, уже используемое активным размером, стандартной ошибкой NOT_UNIQUE. */
	private async checkUnique(value: number): Promise<void> {
		const sameSize: SizeEntity = await this.sizesRepository.findOne({
			where: {
				value,
				...defaultActiveEntity.where,
			},
		});

		if (sameSize) {
			throw new HttpException(
				{
					code: ApiErrorCodes.NOT_UNIQUE,
					entity: ApiEntityNames.SIZE,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
	}
}
