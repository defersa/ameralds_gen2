import { Body, Controller, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { CategoriesService } from "@am/db/service/categories.service";
import { ErrorsDto } from "../errors/errors.dto";
import { CategoryDto, CreateCategoryDto } from "./categories.dto";


@Controller()
@ApiTags('categories')
export class CategoriesController {
    constructor(
        private categoriesService: CategoriesService,
    ) {
    }

    @Post('create')
    @ApiCreatedResponse({ description: 'The category has been successfully created.', type: CategoryDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async create(
        @Body() { en, ru }: CreateCategoryDto,
    ): Promise<CategoryDto> {
        return this.categoriesService.createCategory(ru, en);
    }
}
