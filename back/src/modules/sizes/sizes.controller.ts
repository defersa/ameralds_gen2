import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ErrorsDto } from "../errors/errors.dto";
import {
    SizesDto,
    CreateSizeDto,
    SizeDto,
    SizesPaginatedPageDto,
} from "./sizes.dto";
import { Roles } from "@am/core/guards/role.guard";
import { UserRole } from "@am/db/entities";
import { ParamsPaginatedDto, ParamsEntityDto } from "../../common/common.dto";
import { SizesService } from "@am/db/service/patterns/sizes.service";


@Controller('sizes')
@ApiTags('sizes')
export class SizesController {
    constructor(
        private sizesService: SizesService,
    ) {
    }

    @Get('all')
    @ApiCreatedResponse({ description: 'Get all sizes.', type: SizesDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async all(): Promise<SizesDto> {
        return { items: await this.sizesService.getAllSizes() };
    }

    @Post('create')
    @Roles(UserRole.ADMIN)
    @ApiCreatedResponse({ description: 'The size has been successfully created.', type: SizeDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async create(
        @Body() { value }: CreateSizeDto,
    ): Promise<SizeDto> {
        return this.sizesService.createSize(value);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({ description: 'The size has been successfully removed.', type: null })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async remove(
        @Param() params: ParamsEntityDto,
    ): Promise<SizeDto> {
        return this.sizesService.removeSize(params.id);
    }

    @Get(':id')
    @ApiOkResponse({ description: 'Size returned.', type: SizeDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async entity(
        @Param() params: ParamsEntityDto,
    ): Promise<SizeDto> {
        return this.sizesService.getSize(params.id);
    }

    @Get('list/:page')
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({ description: 'The list of sizes successfully returned.', type: SizesPaginatedPageDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async page(
        @Param() params: ParamsPaginatedDto,
    ): Promise<SizesPaginatedPageDto> {
        return this.sizesService.paginatedSizes(Number(params.page));
    }

    @Patch('edit/:id')
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({ description: 'The category has been successfully edited.', type: SizeDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async edit(
        @Param() params: ParamsEntityDto,
        @Body() { value }: CreateSizeDto,
    ): Promise<SizeDto> {
        return this.sizesService.editSize(params.id, value);
    }
}
