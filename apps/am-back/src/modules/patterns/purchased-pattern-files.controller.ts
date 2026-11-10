import { Auth } from '@am-back/core/guards/auth.guard';
import { FilesService } from '@am-back/db/service/files.service';
import { UserPatternService } from '@am-back/db/service/general/user-pattern.service';
import type { RequestModel } from '@am-back/models/request.model';
import { ErrorsDto } from '@am-back/modules/errors/errors.dto';
import { Controller, Get, Param, ParseIntPipe, Req, StreamableFile } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiProduces, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { extname } from 'node:path';


@Controller('patterns')
@ApiTags('patterns')
@Auth()
export class PurchasedPatternFilesController {
    /** Подключает проверку эффективных прав и открытие уже разрешённого приватного файла. */
    constructor(
        private readonly purchases: UserPatternService,
        private readonly files: FilesService,
    ) {}

    /** Скачивает материал действующего размера или разрешённый цвет схемы только для авторизованного владельца. */
    @Get(':id/download/:fileId')
    @ApiProduces('application/pdf', 'image/png', 'application/octet-stream')
    @ApiOkResponse({
        description: 'Материал доступного размера либо цвет схемы при наличии действующего размера.',
        schema: {
            type: 'string',
            format: 'binary',
        },
    })
    @ApiBadRequestResponse({
        description: 'NOT_EXIST: материал отсутствует, неактивен или недоступен по действующим правам пользователя.',
        type: ErrorsDto,
    })
    @ApiUnauthorizedResponse({
        description: 'Требуется авторизация.',
        type: ErrorsDto,
    })
    public async download(
        @Req() request: RequestModel,
        @Param('id', ParseIntPipe) patternId: number,
        @Param('fileId', ParseIntPipe) fileId: number,
    ): Promise<StreamableFile> {
        const file = await this.purchases.getPurchasedFile(request.user.id, patternId, fileId);
        const stream = await this.files.getFileAsStream(file);

        const filename = encodeURIComponent(file.name).replace(
            /['()*]/g,
            (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
        );

        const extension = extname(file.name).toLowerCase();
        const type = extension === '.pdf' ? 'application/pdf' : extension === '.png' ? 'image/png' : 'application/octet-stream';

        return new StreamableFile(stream, {
            type,
            disposition: `attachment; filename*=UTF-8''${filename}`,
        });
    }
}
