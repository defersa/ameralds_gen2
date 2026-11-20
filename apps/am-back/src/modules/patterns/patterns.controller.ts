import { Auth } from '../../core/guards/auth.guard';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse, getSchemaPath } from "@nestjs/swagger";
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from "@nestjs/common";
import { Roles } from "@am-back/core/guards/role.guard";
import { ErrorsDto } from "../errors/errors.dto";
import {
    CreatePatternDto,
    FullPatternEntityDto,
    PatternEntityDto,
    PatternsPaginatedFilterDto,
    PatternsPaginatedPageDto
} from "./patterns.dto";
import { ParamsEntityDto, ParamsPaginatedDto, SuccessCreateDto } from "../../common/common.dto";
import { PatternsService } from "@am-back/db/service/patterns/patterns.service";
import { UserRole } from '../../db/entities/user.entity';
import { toArray, toNumberArray, toString } from '@ameralds/utils';
import type { RequestModel } from '@am-back/models/request.model';
import { PurchasedPatternsQueryPipe } from './purchased-patterns-query.pipe';



@Controller('patterns')
@ApiTags('patterns')
export class PatternsController {
    constructor(
        private patternsService: PatternsService,
    ) {
    }

    @Post('create')
    @Auth()
    @Roles(UserRole.ADMIN)
    @ApiCreatedResponse({ description: 'The pattern successfully created.', type: SuccessCreateDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async create(
        @Body() value: CreatePatternDto,
    ): Promise<SuccessCreateDto> {
        return await this.patternsService.createPattern(value);
    }

    @Get('list/:page')
    @ApiOkResponse({ description: '', type: PatternsPaginatedPageDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async page(
        @Param() params: ParamsPaginatedDto,
        @Query() filters: PatternsPaginatedFilterDto,
    ): Promise<PatternsPaginatedPageDto> {
        return this.patternsService.paginatedPatterns(Number(params.page), {
            sizes: toNumberArray(filters.sizes),
            categories: toNumberArray(filters.categories),
            query: toString(filters.query),
        });
    }

    /** Возвращает действующие покупки текущего пользователя с фильтрами каталога; чужой userId из запроса не используется. */
    @Get('purchased/:page')
    @Auth()
    @ApiOkResponse({ description: 'Купленные схемы текущего пользователя с пагинацией и фильтрами каталога.', type: PatternsPaginatedPageDto })
    @ApiBadRequestResponse({ description: 'Некорректная страница или фильтры.', type: ErrorsDto })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация.', type: ErrorsDto })
    public purchased(
        @Req() request: RequestModel,
        @Param('page', ParseIntPipe) page: number,
        @Query(PurchasedPatternsQueryPipe) filters: PatternsPaginatedFilterDto,
    ): Promise<PatternsPaginatedPageDto> {
        return this.patternsService.paginatedPatterns(page, {
            sizes: filters.sizes ?? [],
            categories: filters.categories ?? [],
            query: filters.query ?? '',
        }, request.user.id);
    }

    @Get('ids')
    @ApiOkResponse({
        description: '',
        schema: {
            type: 'object',
            additionalProperties: { $ref: getSchemaPath(PatternEntityDto) },
        }
    })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async byIds(
        @Query('id') ids: number[],
    ): Promise<unknown> {
        if (!ids) {
            return {};
        }

        return this.patternsService.patternsById(toArray(ids));
    }

    @Patch('edit/:id')
    @Auth()
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({ description: 'The category has been successfully edited.', type: SuccessCreateDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async edit(
        @Param() params: ParamsEntityDto,
        @Body() value: CreatePatternDto,
    ): Promise<SuccessCreateDto> {
        return this.patternsService.editPattern(params.id, value);
    }

    /** Возвращает карточку с числовыми ID файлов размеров; приватные пути файлов в ответ не попадают. */
    @Get(':id')
    @ApiOkResponse({ description: 'Карточка схемы с ID доступных файлов размеров; отсутствующие или неактивные файлы равны null.', type: FullPatternEntityDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async entity(
        @Param() params: ParamsEntityDto,
    ): Promise<FullPatternEntityDto> {
        return this.patternsService.getPatternDetails(params.id);
    }
}
