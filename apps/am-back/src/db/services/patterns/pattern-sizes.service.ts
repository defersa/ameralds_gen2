import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { In, Repository } from "typeorm";
import { DataSourceService } from "../../data-source.service";
import { FilesService } from "@am-back/db/service/files.service";
import { SizesService } from "@am-back/db/service/patterns/sizes.service";
import { PatternSizeDto } from "../../../modules/patterns/patterns.dto";
import { ModelState } from "../../abstract/abstract.model";
import { PatternSizeEntity } from "../../entities/patterns/pattern-size.entity";
import { SizeEntity } from "../../entities/patterns/size.entity";
import { FileEntity } from "../../entities/files/file.entity";


@Injectable()
export class PatternsSizeService {
	private patternsSizeRepository: Repository<PatternSizeEntity>;

	/** Подключает репозиторий размеров схем и сервисы размеров и приватных файлов. */
	constructor(
		private dataSource: DataSourceService,
		private sizesService: SizesService,
		private filesService: FilesService,
	) {
		this.patternsSizeRepository = this.dataSource.getRepository<PatternSizeEntity>(PatternSizeEntity);
	}

	/** Создаёт размер схемы с CBB, PNG и PDF и помечает эти файлы используемыми. */
	public async createPatternSize(data: PatternSizeDto): Promise<PatternSizeEntity> {
		const size: SizeEntity = await this.sizesService.getSize(data.size);
		const cbb: FileEntity = await this.filesService.getPrivateFile(data.cbb);
		const png: FileEntity = await this.filesService.getPrivateFile(data.png);
		const pdf: FileEntity = await this.filesService.getPrivateFile(data.pdf);

		await this.filesService.setUsageStatus(pdf, true);
		await this.filesService.setUsageStatus(png, true);
		await this.filesService.setUsageStatus(cbb, true);

		const patternSize: PatternSizeEntity = this.patternsSizeRepository.create({
			size,
			cbb,
			png,
			pdf,
		});

		await this.patternsSizeRepository.save(patternSize);

		return patternSize;
	}

	/**
	 * Заменяет файлы активного размера схемы, обновляя признаки использования; отсутствие размера вызывает
	 * NOT_EXIST.
	 */
	public async editPatternSize(id: number, data: PatternSizeDto): Promise<PatternSizeEntity> {
		const patternSize: PatternSizeEntity = await this.patternsSizeRepository.findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
			relations: {
				size: true,
				cbb: true,
				png: true,
				pdf: true,
			},
		});

		if (!patternSize) {
			throw new HttpException(
				{
					code: ApiErrorCodes.NOT_EXIST,
					entity: ApiEntityNames.PATTERN_SIZE,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const cbb: FileEntity = await this.filesService.getPrivateFile(data.cbb);
		const png: FileEntity = await this.filesService.getPrivateFile(data.png);
		const pdf: FileEntity = await this.filesService.getPrivateFile(data.pdf);

		await this.filesService.setUsageStatus(patternSize.cbb, false);
		await this.filesService.setUsageStatus(patternSize.png, false);
		await this.filesService.setUsageStatus(patternSize.pdf, false);

		await this.filesService.setUsageStatus(pdf, true);
		await this.filesService.setUsageStatus(png, true);
		await this.filesService.setUsageStatus(cbb, true);

		patternSize.state = ModelState.ACTIVE;
		patternSize.cbb = cbb;
		patternSize.png = png;
		patternSize.pdf = pdf;

		await this.patternsSizeRepository.save(patternSize);

		return patternSize;
	}

	/** Возвращает размеры конкретной схемы по идентификаторам размеров каталога. */
	public async getPatternSizes(patternId: number, sizeIds: number[]): Promise<PatternSizeEntity[]> {
		return await this.patternsSizeRepository
			.find({
				where: {
					pattern: {
						id: patternId,
					},
					size: {
						id: In(sizeIds),
					},
				},
			});
	}

	/** Помечает размер схемы неактивным и освобождает признаки использования его файлов. */
	public async removePatternSize(patternSize: PatternSizeEntity): Promise<PatternSizeEntity> {
		patternSize.state = ModelState.INACTIVE;

		await this.filesService.setUsageStatus(patternSize.cbb, false);
		await this.filesService.setUsageStatus(patternSize.png, false);
		await this.filesService.setUsageStatus(patternSize.pdf, false);

		await this.patternsSizeRepository.save(patternSize);

		return patternSize;
	}
}
