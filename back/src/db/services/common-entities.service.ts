import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../data-source.service";
import { LabelLangEntity, NumberLangEntity, TextLangEntity } from "@am/db/entities";


@Injectable()
export class CommonEntitiesService {
    private labelRepository: Repository<LabelLangEntity>;
    private textRepository: Repository<TextLangEntity>;
    private numberRepository: Repository<NumberLangEntity>;

    constructor(
        private dataSource: DataSourceService,
    ) {
        this.labelRepository = this.dataSource.getRepository<LabelLangEntity>(LabelLangEntity);
        this.textRepository = this.dataSource.getRepository<TextLangEntity>(TextLangEntity);
        this.numberRepository = this.dataSource.getRepository<NumberLangEntity>(NumberLangEntity);
    }

    public createLabel(ru: string, en: string): Promise<LabelLangEntity> {
        const label: LabelLangEntity = this.labelRepository.create({
            en,
            ru,
        });

        return this.labelRepository.save(label);
    }

    public removeLabel(label: LabelLangEntity): Promise<LabelLangEntity> {
        if (!label) {
            return;
        }

        return this.labelRepository.remove(label);
    }

    public createText(ru: string, en: string): Promise<TextLangEntity> {
        const label: TextLangEntity = this.textRepository.create({
            en,
            ru,
        });

        return this.textRepository.save(label);
    }

    public removeText(label: TextLangEntity): Promise<TextLangEntity> {
        if (!label) {
            return;
        }

        return this.textRepository.remove(label);
    }

    public createNumber(ru: number, en: number): Promise<NumberLangEntity> {
        const numberEntity: NumberLangEntity = this.numberRepository.create({
            en,
            ru,
        });

        return this.numberRepository.save(numberEntity);
    }

    public removeNumber(numberEntity: NumberLangEntity): Promise<NumberLangEntity> {
        if (!numberEntity) {
            return;
        }

        return this.numberRepository.remove(numberEntity);
    }
}
