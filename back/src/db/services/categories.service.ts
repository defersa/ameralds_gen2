import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../data-source.service";
import { CategoryEntity, LabelLangEntity } from "@am/db/entities";
import { CommonEntitiesService } from "@am/db/service/common-entities.service";


@Injectable()
export class CategoriesService {
    private categoriesRepository: Repository<CategoryEntity>;

    constructor(
        private dataSource: DataSourceService,
        private commonEntitiesService: CommonEntitiesService,
    ) {
        this.categoriesRepository = this.dataSource.getRepository<CategoryEntity>(CategoryEntity);
    }

    public async createCategory(ru: string, en: string): Promise<CategoryEntity> {
        const label: LabelLangEntity = await this.commonEntitiesService.createLabel(ru, en);
        const category: CategoryEntity = this.categoriesRepository.create();

        category.label = label;

        return this.categoriesRepository.save(category);
    }
}
