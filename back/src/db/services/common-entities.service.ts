import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../data-source.service";
import { LabelLangEntity } from "@am/db/entities";


@Injectable()
export class CommonEntitiesService {
    private labelRepository: Repository<LabelLangEntity>;

    constructor(
        private dataSource: DataSourceService,
    ) {
        this.labelRepository = this.dataSource.getRepository<LabelLangEntity>(LabelLangEntity);
    }

    public createLabel(ru: string, en: string): Promise<LabelLangEntity> {
        const label: LabelLangEntity = this.labelRepository.create({
            en,
            ru,
        });

        return this.labelRepository.save(label);
    }
}
