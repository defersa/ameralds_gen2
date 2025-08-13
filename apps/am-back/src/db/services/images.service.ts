import { Inject, Injectable } from "@nestjs/common";
import { getPathWithDir } from "../../utils/path-with-dir";
import sharp from "sharp";
import { APP_CONFIG } from '@am-back/core/config/app-config.module';
import type { AppConfigInterface } from '@am-back/core/config/app-config.module';
import { DataSourceService } from "../data-source.service";
import { In, Repository } from "typeorm";
import { removeFile } from "../../utils/remove-file";
import { join } from "path";
import { Cron } from "@nestjs/schedule";
import { ImageEntity } from '../entities/image/image.entity';


@Injectable()
export class ImagesService {
    private imagesRepository: Repository<ImageEntity>;

    constructor(
        private dataSource: DataSourceService,
        @Inject(APP_CONFIG) private readonly appConfig: AppConfigInterface,
    ) {
        this.imagesRepository = this.dataSource.getRepository<ImageEntity>(ImageEntity);
    }

    public async createImage(image: Express.Multer.File): Promise<ImageEntity> {
        const name: string = `${new Date().valueOf()}_${image.originalname}`;
        const full: string = join(...this.appConfig.fullImagesPath, name);
        const fullPath: string = getPathWithDir(...this.appConfig.fullImagesPath, name)
        const preview: string = join(...this.appConfig.previewImagesPath, name);
        const previewPath: string = getPathWithDir(...this.appConfig.previewImagesPath, name)

        await sharp(image.buffer)
            .resize(1920, 1080)
            .webp({ effort: 3 })
            .toFile(fullPath);
        await sharp(image.buffer)
            .resize(960, 540)
            .webp({ effort: 3 })
            .toFile(previewPath);

        const imageEntity: ImageEntity = this.imagesRepository.create({
            name: image.originalname,
            full,
            preview,
        });

        await this.imagesRepository.save(imageEntity);

        return imageEntity;
    }

    public async removeImage(id: number): Promise<void> {
        const image: ImageEntity = await this.imagesRepository.findOneBy({ id });

        try {
            removeFile(image.full);
        } catch (error) {}

        try {
            removeFile(image.preview);
        } catch (error) {}

        await this.imagesRepository.remove(image);
    }

    public async getImagesByIds(ids: number[]): Promise<ImageEntity[]> {
        return this.imagesRepository.find({
            where: {
                id: In(ids),
            },
        });
    }

    public async setUsageStatus(images: ImageEntity[], status: boolean): Promise<void> {
        (images || []).forEach((image: ImageEntity) => {
            image.using = status;

            this.imagesRepository.save(image);
        })
    }

    @Cron('0 0 3 * * *', {
        name: 'clean unused images'
    })
    private async cleanUnusedImages(): Promise<void> {
        const images: ImageEntity[] = await this.imagesRepository.find({
            where: {
                using: false,
            },
        });

        if (!images?.length) {
            return ;
        }

        images.forEach((image: ImageEntity) => this.removeImage(image.id));
    }

    // TODO: not good
    public async updateIndex(images: ImageEntity[], ids: number[]): Promise<void> {
        (ids || []).forEach((id: number, index: number) => {
            const image: ImageEntity = images.find((image: ImageEntity) => image.id === id);

            if (!image) {
                return;
            }

            image.index = index;

            this.imagesRepository.save(image);
        })
    }
}
