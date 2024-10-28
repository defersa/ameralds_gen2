import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../data-source.service";
import { APP_CONFIG, AppConfigInterface } from "@am/core/config/app-config.module";
import { FileEntity, PrivateFileEntity, PublicFileEntity } from "../entities/files/file.entity";
import { getPathWithDir } from "../../utils/path-with-dir";
import { createReadStream, createWriteStream, WriteStream } from "fs";
import { removeFile } from "../../utils/remove-file";
import { ModelState } from "../abstract/abstract.model";
import { ReadStream } from "typeorm/browser/platform/BrowserPlatformTools";
import { ImageEntity } from "@am/db/entities";
import { ApiEntityNames, ApiErrorCodes } from "../../modules/errors/errors.dto";


@Injectable()
export class FilesService {
    private publicFilesRepository: Repository<PublicFileEntity>;
    private privateFilesRepository: Repository<PrivateFileEntity>;
    private filesRepository: Repository<FileEntity>;

    constructor(
        private dataSource: DataSourceService,
        @Inject(APP_CONFIG) private readonly appConfig: AppConfigInterface,
    ) {
        this.publicFilesRepository = this.dataSource.getRepository<PublicFileEntity>(PublicFileEntity);
        this.privateFilesRepository = this.dataSource.getRepository<PrivateFileEntity>(PrivateFileEntity);
        this.filesRepository = this.dataSource.getRepository<FileEntity>(FileEntity);
    }

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

    public async removeFile(id: number): Promise<void> {
        const file: FileEntity = await this.filesRepository.findOneBy({ id });

        file.state = ModelState.INACTIVE;

        removeFile(file.path);

        await this.filesRepository.remove(file);
    }

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

    public async getPrivateFile(id: number): Promise<FileEntity> {
        const file: FileEntity = await this.privateFilesRepository.findOne({
            where: { id },
        });

        if (!file) {
            throw new HttpException({ code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE }, HttpStatus.BAD_REQUEST);
        }

        return
    }

    public async getPrivateFileAsStream(id: number): Promise<ReadStream> {
        const fileEntity: PrivateFileEntity = await this.privateFilesRepository.findOne({
            where: { id },
        });

        if (!fileEntity) {
            return null;
        }

        return createReadStream(fileEntity.path);
    }

    public async setUsageStatus(file: FileEntity, status: boolean): Promise<void> {
        if (!file) {
            return ;
        }

        file.using = status;

        await this.filesRepository.save(file);
    }
}
