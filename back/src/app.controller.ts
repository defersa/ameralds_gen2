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
import { AppService } from "./app.service";
import { RequestModel } from "@am/models/request.model";
import { Auth } from "@am/core/guards/auth.guard";
import { createReadStream, createWriteStream } from "fs";
import { join } from "path";
import { process } from "@am/core/declare/process";
import { FileInterceptor } from "@nestjs/platform-express";
import { getPathWithDir } from "./utils/path-with-dir";
import { APP_CONFIG, AppConfigInterface } from "@am/core/config/app-config.module";
import { ImageService } from "@am/db/service/image.service";
import { ImageEntity } from "@am/db/entities";


@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly imageService: ImageService,
        @Optional() @Inject(APP_CONFIG) private readonly appConfig: AppConfigInterface,
    ) {
    }

    @Get("test")
    getHello(
        @Req() request: RequestModel
    ): string {

        console.log((request as any).user);

        return this.appService.getHello();
    }

    @Get("auth-test")
    @Auth()
    getAuthHello(
        @Req() request: RequestModel
    ): string {

        console.log((request as any).user);

        return this.appService.getHello();
    }

    @Get("file")
    getFile() {
        const file = createReadStream(join(process.cwd(), "package.json"));
        return new StreamableFile(file);
    }

    @Post("upload")
    @UseInterceptors(
        FileInterceptor("file") as unknown as NestInterceptor,
    )
    upload(
        @UploadedFile() file: Express.Multer.File
    ) {
        const path: string = getPathWithDir(["uploads", "files", file.originalname]);

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
