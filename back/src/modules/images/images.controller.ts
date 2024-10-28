import { ApiBadRequestResponse, ApiBody, ApiConsumes, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { Body, Controller, NestInterceptor, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { Roles } from "@am/core/guards/role.guard";
import { UserRole } from "@am/db/entities";
import { ErrorsDto } from "../errors/errors.dto";
import { ImagesService } from "@am/db/service/images.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImageDto } from "./images.dto";
import { CreatePatternDto } from "../patterns/patterns.dto";



@Controller('images')
@ApiTags('images')
export class ImagesController {
    constructor(
        private imageService: ImagesService,
    ) {
    }

    @Post('create')
    @Roles(UserRole.ADMIN)
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor("file") as unknown as NestInterceptor,
    )
    @ApiCreatedResponse({ description: 'The image successfully created.', type: ImageDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async create(
        @UploadedFile() file: Express.Multer.File,
    ): Promise<ImageDto> {
        return await this.imageService.createImage(file);
    }
}
