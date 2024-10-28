import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { PatternsService } from "@am/db/service/patterns.service";
import { Roles } from "@am/core/guards/role.guard";
import { UserRole } from "@am/db/entities";
import { ErrorsDto } from "../errors/errors.dto";
import { CreatePatternDto, PatternEntityDto, PatternsPaginatedPageDto } from "./patterns.dto";
import { ParamsEntityDto, ParamsPaginatedDto, SuccessCreateDto } from "../../common/common.dto";



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
    ): Promise<PatternsPaginatedPageDto> {
        return this.patternsService.paginatedPatterns(Number(params.page));
    }

    @Get(':id')
    @ApiOkResponse({ description: '', type: PatternEntityDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async entity(
        @Param() params: ParamsEntityDto,
    ): Promise<PatternEntityDto> {
        return this.patternsService.getPattern(params.id);
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
}
