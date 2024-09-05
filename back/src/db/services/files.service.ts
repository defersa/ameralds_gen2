import { Inject, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../data-source.service";
import { APP_CONFIG, AppConfigInterface } from "@am/core/config/app-config.module";
import { FileEntity } from "../entities/files/file.entity";
import { getPathWithDir } from "../../utils/path-with-dir";
import { createWriteStream, WriteStream } from "fs";
import { removeFile } from "../../utils/remove-file";


@Injectable()
export class FilesService {
    private filesRepository: Repository<FileEntity>;

    constructor(
        private dataSource: DataSourceService,
        @Inject(APP_CONFIG) private readonly appConfig: AppConfigInterface,
    ) {
        this.filesRepository = this.dataSource.getRepository<FileEntity>(FileEntity);
    }

    public async createFile(file: Express.Multer.File): Promise<FileEntity> {
        const name: string = `${file.originalname}.${new Date().valueOf()}`;
        const path: string = getPathWithDir([...this.appConfig.fullImagesPath, name]);

        const stream: WriteStream = createWriteStream(path);
        stream.write(file.buffer);
        stream.end();

        const fileEntity: FileEntity = await this.filesRepository.create({
            path,
        });

        await this.filesRepository.save(fileEntity);

        return fileEntity;
    }

    public async removeFile(id: number): Promise<void> {
        const file: FileEntity = await this.filesRepository.findOneBy({ id });

        removeFile([file.path]);

        await this.filesRepository.remove(file);
    }
}
