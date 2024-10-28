import {
    Controller,
    Get, Inject,
    NestInterceptor, Optional,
    Post, Query,
    Req,
    StreamableFile,
    UploadedFile,
    UseInterceptors
} from "@nestjs/common";
import { RequestModel } from "@am/models/request.model";
import { Auth } from "@am/core/guards/auth.guard";
import { createReadStream, createWriteStream } from "fs";
import { join } from "path";
import { process } from "@am/core/declare/process";
import { FileInterceptor } from "@nestjs/platform-express";
import { getPathWithDir } from "./utils/path-with-dir";
import { APP_CONFIG, AppConfigInterface } from "@am/core/config/app-config.module";
import { ImagesService } from "@am/db/service/images.service";
import { ImageEntity } from "@am/db/entities";
import { ReadStream } from "typeorm/browser/platform/BrowserPlatformTools";


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
        return new StreamableFile(file as Uint8Array);
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
