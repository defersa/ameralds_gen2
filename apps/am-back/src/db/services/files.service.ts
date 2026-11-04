import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import type { AppConfigInterface } from "@am-back/core/config/app-config.module";
import { APP_CONFIG } from "@am-back/core/config/app-config.module";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { createReadStream, createWriteStream, ReadStream, WriteStream } from "fs";
import { open } from "fs/promises";
import { Repository } from "typeorm";
import { getPathWithDir } from "../../utils/path-with-dir";
import { removeFile } from "../../utils/remove-file";
import { ModelState } from "../abstract/abstract.model";
import { DataSourceService } from "../data-source.service";
import { FileEntity, PrivateFileEntity, PublicFileEntity } from "../entities/files/file.entity";


@Injectable()
export class FilesService {
	private publicFilesRepository: Repository<PublicFileEntity>;
	private privateFilesRepository: Repository<PrivateFileEntity>;
	private filesRepository: Repository<FileEntity>;

	/** Подключает репозитории файлов и конфигурацию каталогов публичного и приватного хранения. */
	constructor(
		private dataSource: DataSourceService,
		@Inject(APP_CONFIG) private readonly appConfig: AppConfigInterface,
	) {
		this.publicFilesRepository = this.dataSource.getRepository<PublicFileEntity>(PublicFileEntity);
		this.privateFilesRepository = this.dataSource.getRepository<PrivateFileEntity>(PrivateFileEntity);
		this.filesRepository = this.dataSource.getRepository<FileEntity>(FileEntity);
	}

	/**
	 * Записывает загруженный буфер в публичный каталог с уникализированным именем и сохраняет сущность
	 * файла.
	 */
	public async createPublicFile(file: Express.Multer.File): Promise<FileEntity> {
		const name: string = `${file.originalname}.${new Date().valueOf()}`;
		const path: string = getPathWithDir(...this.appConfig.filesPath, name);

		const stream: WriteStream = createWriteStream(path);

		stream.write(file.buffer);
		stream.end();

		const fileEntity: PublicFileEntity = this.publicFilesRepository.create({
			path,
		});

		await this.publicFilesRepository.save(fileEntity);

		return fileEntity;
	}

	/** Удаляет файл с диска и его запись из хранилища по идентификатору. */
	public async removeFile(id: number): Promise<void> {
		const file: FileEntity = await this.filesRepository.findOneBy({ id });

		file.state = ModelState.INACTIVE;

		removeFile(file.path);

		await this.filesRepository.remove(file);
	}

	/** Записывает загруженный буфер в приватный каталог и сохраняет исходное имя вместе с путём файла. */
	public async createPrivateFile(file: Express.Multer.File): Promise<FileEntity> {
		const name: string = `${new Date().valueOf()}_${file.originalname}`;
		const path: string = getPathWithDir(...this.appConfig.privateFilesPath, name);

		const stream: WriteStream = createWriteStream(path);

		stream.write(file.buffer);
		stream.end();

		const fileEntity: PrivateFileEntity = this.privateFilesRepository.create({
			name: file.originalname,
			path,
		});

		await this.privateFilesRepository.save(fileEntity);

		return fileEntity;
	}

	/** Возвращает приватный файл по идентификатору; при отсутствии записи возвращает NOT_EXIST для файла. */
	public async getPrivateFile(id: number): Promise<FileEntity> {
		const file: FileEntity = await this.privateFilesRepository.findOne({
			where: { id },
		});

		if (!file) {
			throw new HttpException(
				{
					code: ApiErrorCodes.NOT_EXIST,
					entity: ApiEntityNames.FILE,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		return file;
	}

	/** Открывает поток приватного файла по идентификатору; если записи нет, возвращает null. */
	public async getPrivateFileAsStream(id: number): Promise<ReadStream> {
		const fileEntity: PrivateFileEntity = await this.privateFilesRepository.findOne({
			where: { id },
		});

		if (!fileEntity) {
			return null;
		}

		return createReadStream(fileEntity.path);
	}

	/**
	 * Открывает поток уже выбранного файла. Отсутствующий файл или каталог преобразует в NOT_EXIST;
	 * остальные ошибки файловой системы передаёт вызывающему коду.
	 */
	public async getFileAsStream(file: Pick<FileEntity, "path">): Promise<ReadStream> {
		try {
			const handle = await open(file.path, "r");

			return handle.createReadStream();
		} catch (error) {
			if (error.code === "ENOENT" || error.code === "ENOTDIR") {
				throw new HttpException(
					{
						code: ApiErrorCodes.NOT_EXIST,
						entity: ApiEntityNames.FILE,
					},
					HttpStatus.BAD_REQUEST,
				);
			}

			throw error;
		}
	}

	/** Обновляет признак использования файла; отсутствие файла не требует действий. */
	public async setUsageStatus(file: FileEntity, status: boolean): Promise<void> {
		if (!file) {
			return;
		}

		file.using = status;

		await this.filesRepository.save(file);
	}
}
