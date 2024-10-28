import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../data-source.service";
import { SizeEntity } from "@am/db/entities";
import { ModelState } from "../abstract/abstract.model";
import { SizesPaginatedPageDto } from "../../modules/sizes/sizes.dto";
import { ApiEntityNames, ApiErrorCodes } from "../../modules/errors/errors.dto";


@Injectable()
export class SizesService {
    private sizesRepository: Repository<SizeEntity>;

    constructor(
        private dataSource: DataSourceService,
    ) {
        this.sizesRepository = this.dataSource.getRepository<SizeEntity>(SizeEntity);
    }

    public async createSize(value: number): Promise<SizeEntity> {
        const size: SizeEntity = this.sizesRepository.create({ value });

        return this.sizesRepository.save(size);
    }

    public async editSize(id: number, value: number): Promise<SizeEntity> {
        const size: SizeEntity = await this.sizesRepository.findOne({
            where: {
                id,
                state: ModelState.ACTIVE,
            },
        });

        if (!size) {
            return null;
        }

        size.value = value;

        return this.sizesRepository.save(size);
    }

    public async removeSize(id: number): Promise<SizeEntity> {
        const size: SizeEntity = await this.sizesRepository.findOne({
            where: {
                id,
                state: ModelState.ACTIVE,
            },
        });

        if (!size) {
            return null;
        }

        size.state = ModelState.INACTIVE;

        return this.sizesRepository.save(size);
    }

    public async paginatedSizes(page: number): Promise<SizesPaginatedPageDto> {
        const take: number = 10;
        const skip: number = take * (page - 1);
        const count: number = Math.ceil(await this.sizesRepository.count() / take);

        const sizes: SizeEntity[] = await this.sizesRepository.find({
            where: {
                state: ModelState.ACTIVE,
            },
            take,
            skip,
        });

        return {
            page,
            count,
            items: sizes,
        };
    }

    public async getSize(id: number): Promise<SizeEntity> {
        const size: SizeEntity = await this.sizesRepository.findOne({
            where: {
                id,
                state: ModelState.ACTIVE,
            },
        });

        if (!size) {
            throw new HttpException({ code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.SIZE }, HttpStatus.BAD_REQUEST);
        }

        return size;
    }

    public async getAllSizes(): Promise<SizeEntity[]> {
        return this.sizesRepository.find({
            where: {
                state: ModelState.ACTIVE,
            },
        });
    }
}
