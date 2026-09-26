import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
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



@Controller('patterns')
@ApiTags('patterns')
export class PatternsController {
    constructor(
        private patternsService: PatternsService,
    ) {
    }

    @Post('create')
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
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({ description: 'The category has been successfully edited.', type: SuccessCreateDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async edit(
        @Param() params: ParamsEntityDto,
        @Body() value: CreatePatternDto,
    ): Promise<SuccessCreateDto> {
        return this.patternsService.editPattern(params.id, value);
    }

    @Get(':id')
    @ApiOkResponse({ description: '', type: FullPatternEntityDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async entity(
        @Param() params: ParamsEntityDto,
    ): Promise<FullPatternEntityDto> {
        return await this.patternsService.getPattern(params.id) as unknown as FullPatternEntityDto;
    }
}
