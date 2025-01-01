import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ErrorsDto } from "../errors/errors.dto";
import { CategoriesDto, CategoriesPaginatedPageDto, CategoryDto, CreateCategoryDto } from "./categories.dto";
import { Roles } from "@am/core/guards/role.guard";
import { CategoryEntity, UserRole } from "@am/db/entities";
import { ParamsPaginatedDto, ParamsEntityDto } from "../../common/common.dto";
import { CategoriesService } from "@am/db/service/patterns/categories.service";


@Controller('categories')
@ApiTags('categories')
export class CategoriesController {
    constructor(
        private categoriesService: CategoriesService,
    ) {
    }

    @Get('all')
    @ApiCreatedResponse({ description: 'Get all categories.', type: CategoriesDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async all(): Promise<CategoriesDto> {
        return { items: await this.categoriesService.getAllCategories() };
    }

    @Post('create')
    @Roles(UserRole.ADMIN)
    @ApiCreatedResponse({ description: 'The category has been successfully created.', type: CategoryDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async create(
        @Body() { en, ru }: CreateCategoryDto,
    ): Promise<CategoryDto> {
        return this.categoriesService.createCategory(ru, en);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({ description: 'The category has been successfully removed.', type: null })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async remove(
        @Param() params: ParamsEntityDto,
    ): Promise<CategoryEntity> {
        return this.categoriesService.removeCategory(params.id);
    }

    @Get(':id')
    @ApiOkResponse({ description: 'Category returned.', type: CategoryDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async entity(
        @Param() params: ParamsEntityDto,
    ): Promise<CategoryEntity> {
        return this.categoriesService.getCategory(params.id);
    }

    @Get('list/:page')
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({ description: 'The list of categories successfully returned.', type: CategoriesPaginatedPageDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async page(
        @Param() params: ParamsPaginatedDto,
    ): Promise<CategoriesPaginatedPageDto> {
        return this.categoriesService.paginatedCategories(Number(params.page));
    }

    @Patch('edit/:id')
    @ApiOkResponse({ description: 'The category has been successfully edited.', type: CategoryDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async edit(
        @Param() params: ParamsEntityDto,
        @Body() { en, ru }: CreateCategoryDto,
    ): Promise<CategoryEntity> {
        return this.categoriesService.editCategory(params.id, ru, en);
    }
}
