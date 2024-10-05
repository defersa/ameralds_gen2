import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { CategoriesService } from "@am/db/service/categories.service";
import { ErrorsDto } from "../errors/errors.dto";
import { CategoriesDto, CategoryDto, CreateCategoryDto } from "./categories.dto";
import { Roles } from "@am/core/guards/role.guard";
import { UserRole } from "@am/db/entities";


@Controller()
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
}
