import { Inject, Injectable } from "@nestjs/common";
import { getPathWithDir } from "../../utils/path-with-dir";
import * as sharp from "sharp";
import { APP_CONFIG, AppConfigInterface } from "@am/core/config/app-config.module";
import { DataSourceService } from "../data-source.service";
import { Repository } from "typeorm";
import { ImageEntity } from "@am/db/entities";
import { removeFile } from "../../utils/remove-file";


@Injectable()
export class ImageService {
    private imageRepository: Repository<ImageEntity>;

    constructor(
        private dataSource: DataSourceService,
        @Inject(APP_CONFIG) private readonly appConfig: AppConfigInterface,
    ) {
        this.imageRepository = this.dataSource.getRepository<ImageEntity>(ImageEntity);
    }

    public async createImage(image: Express.Multer.File): Promise<ImageEntity> {
        const name: string = `${image.originalname}.${new Date().valueOf()}`;
        const fullPath: string = getPathWithDir([...this.appConfig.fullImagesPath, name]);
        const previewPath: string = getPathWithDir([...this.appConfig.previewImagesPath, name]);

        await sharp(image.buffer)
            .resize(1920, 1080)
            .webp({ effort: 3 })
            .toFile(fullPath);

        await sharp(image.buffer)
            .resize(683, 384)
            .webp({ effort: 3 })
            .toFile(previewPath);

        const imageEntity: ImageEntity = await this.imageRepository.create({
            name: image.originalname,
            full: fullPath,
            preview: previewPath,
        });

        await this.imageRepository.save(imageEntity);

        return imageEntity;
    }

    public async removeImage(id: number): Promise<void> {
        const image: ImageEntity = await this.imageRepository.findOneBy({ id });

        removeFile([image.full]);
        removeFile([image.preview]);

        await this.imageRepository.remove(image);
    }
}
