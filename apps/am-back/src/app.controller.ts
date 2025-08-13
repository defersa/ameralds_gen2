import {
    Controller,
    Get, Inject,
    NestInterceptor,
    Optional,
    Post,
    Query,
    StreamableFile,
    UploadedFile,
    UseInterceptors
} from "@nestjs/common";
import { createReadStream, createWriteStream, ReadStream } from 'fs';
import { join } from "path";
import { process } from "@am-back/core/declare/process";
import { FileInterceptor } from "@nestjs/platform-express";
import { getPathWithDir } from "./utils/path-with-dir";
import { ImagesService } from "@am-back/db/service/images.service";
import { APP_CONFIG } from '@am-back/core/config/app-config.module';
import type { AppConfigInterface } from '@am-back/core/config/app-config.module';
import { ImageEntity } from './db/entities/image/image.entity';


@Controller()
export class AppController {
    constructor(
        private readonly imageService: ImagesService,
        @Optional() @Inject(APP_CONFIG) private readonly appConfig: AppConfigInterface,
    ) {
    }

    @Get("file")
    getFile() {
        const file: ReadStream = createReadStream(join(process.cwd(), "package.json"));
        return new StreamableFile(file);
    }

    @Post("upload")
    @UseInterceptors(
        FileInterceptor("file") as unknown as NestInterceptor,
    )
    upload(
        @UploadedFile() file: Express.Multer.File
    ) {
        const path: string = getPathWithDir("uploads", "files", file.originalname);

        const stream = createWriteStream(path);
        stream.write(file.buffer);
        stream.end();
    }


    @Post("image")
    @UseInterceptors(
        FileInterceptor("image") as unknown as NestInterceptor,
    )
    public async image(
        @UploadedFile() image: Express.Multer.File
    ) {
        const imageEntity: ImageEntity = await this.imageService.createImage(image);

        return imageEntity.id;
    }

    @Get("patterns/paginated")
    public async fakeHandlerThree(
        @Query('page') page: number,
    ): Promise<[]> {

        return [];
    }
}
