import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import {
    FileEntity,
    PatternSizeEntity, SizeEntity,
} from "@am/db/entities";
import { DataSourceService } from "../data-source.service";
import {
    PatternSizeDto,
} from "../../modules/patterns/patterns.dto";
import { ModelState } from "../abstract/abstract.model";
import { ApiEntityNames, ApiErrorCodes } from "../../modules/errors/errors.dto";
import { FilesService } from "@am/db/service/files.service";
import { SizesService } from "@am/db/service/sizes.service";


@Injectable()
export class PatternsSizeService {
    private patternsSizeRepository: Repository<PatternSizeEntity>;

    constructor(
        private dataSource: DataSourceService,
        private sizesService: SizesService,
        private filesService: FilesService,
    ) {
        this.patternsSizeRepository = this.dataSource.getRepository<PatternSizeEntity>(PatternSizeEntity);
    }

    public async createPatternSize(data: PatternSizeDto): Promise<PatternSizeEntity> {
        const size: SizeEntity = await this.sizesService.getSize(data.size);
        const cbb: FileEntity = await this.filesService.getPrivateFile(data.cbb);
        const jbb: FileEntity = await this.filesService.getPrivateFile(data.jbb);
        const png: FileEntity = await this.filesService.getPrivateFile(data.png);
        const pdf: FileEntity = await this.filesService.getPrivateFile(data.pdf);

        await this.filesService.setUsageStatus(pdf, true);
        await this.filesService.setUsageStatus(png, true);
        await this.filesService.setUsageStatus(jbb, true);
        await this.filesService.setUsageStatus(cbb, true);

        const patternSize: PatternSizeEntity = this.patternsSizeRepository.create({
            size,
            cbb,
            png,
            jbb,
            pdf
        });

        await this.patternsSizeRepository.save(patternSize);

        return patternSize;
    }

    public async editPattern(id: number, data: PatternSizeDto): Promise<PatternSizeEntity> {
        const cbb: FileEntity = await this.filesService.getPrivateFile(data.cbb);
        const jbb: FileEntity = await this.filesService.getPrivateFile(data.jbb);
        const png: FileEntity = await this.filesService.getPrivateFile(data.png);
        const pdf: FileEntity = await this.filesService.getPrivateFile(data.pdf);

        const patternSize: PatternSizeEntity = await this.patternsSizeRepository.findOne({
            where: {
                id,
                state: ModelState.ACTIVE,
            },
            relations: {
                size: true,
                cbb: true,
                jbb: true,
                png: true,
                pdf: true,
            }});

        if (!patternSize) {
            throw new HttpException({ code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.PATTERN_SIZE }, HttpStatus.BAD_REQUEST);
        }

        await this.filesService.setUsageStatus(patternSize.cbb, false);
        await this.filesService.setUsageStatus(patternSize.jbb, false);
        await this.filesService.setUsageStatus(patternSize.png, false);
        await this.filesService.setUsageStatus(patternSize.pdf, false);

        await this.filesService.setUsageStatus(pdf, true);
        await this.filesService.setUsageStatus(png, true);
        await this.filesService.setUsageStatus(jbb, true);
        await this.filesService.setUsageStatus(cbb, true);

        patternSize.cbb = cbb;
        patternSize.jbb = jbb;
        patternSize.png = png;
        patternSize.pdf = pdf;

        await this.patternsSizeRepository.save(patternSize);

        return patternSize;
    }


    private async removePatternSize(patternSize: PatternSizeEntity): Promise<PatternSizeEntity> {
        patternSize.state = ModelState.INACTIVE;

        await this.filesService.setUsageStatus(patternSize.cbb, false);
        await this.filesService.setUsageStatus(patternSize.jbb, false);
        await this.filesService.setUsageStatus(patternSize.png, false);
        await this.filesService.setUsageStatus(patternSize.pdf, false);

        await this.patternsSizeRepository.save(patternSize);

        return patternSize;
    }
}
