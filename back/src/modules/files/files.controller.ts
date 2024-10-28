import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiOkResponse, ApiResponse,
    ApiTags
} from "@nestjs/swagger";
import {
    Controller,
    Get,
    NestInterceptor,
    Param,
    Post,
    StreamableFile,
    UploadedFile,
    UseInterceptors
} from "@nestjs/common";
import { Roles } from "@am/core/guards/role.guard";
import { UserRole } from "@am/db/entities";
import { ErrorsDto } from "../errors/errors.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { FileDto } from "./files.dto";
import { FilesService } from "@am/db/service/files.service";
import { ParamsEntityDto } from "../../common/common.dto";


@Controller('files')
@ApiTags('files')
export class FilesController {
    constructor(
        private filesService: FilesService,
    ) {
    }

    @Post('private/create')
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
    @ApiCreatedResponse({ description: 'The file successfully created.', type: FileDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async createPrivateFile(
        @UploadedFile() file: Express.Multer.File,
    ): Promise<FileDto> {
        return await this.filesService.createPrivateFile(file);
    }


    @Get('private/download/:id')
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({
        schema: {
            type: 'string',
            format: 'binary',
        },
    })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async getPrivateFile(
        @Param() params: ParamsEntityDto,
    ): Promise<StreamableFile> {
        return new StreamableFile(await this.filesService.getPrivateFileAsStream(params.id) as Uint8Array);
    }
}
