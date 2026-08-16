import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../../data-source.service";
import { ModelState } from "../../abstract/abstract.model";
import { UserPatternEntity } from "../../entities/patterns/pattern-order.entity";
import { UserEntity } from "../../entities/user.entity";


@Injectable()
export class UserPatternService {
    private userPatternRepository: Repository<UserPatternEntity>;

    constructor(
        private dataSource: DataSourceService,
    ) {
        this.userPatternRepository = this.dataSource.getRepository<UserPatternEntity>(UserPatternEntity);
    }

    public async getBoughtPatternsByUser(user: UserEntity): Promise<UserPatternEntity[]> {
        return this.userPatternRepository.find({
            where: {
                user: {
                    id: user.id,
                },
                state: ModelState.ACTIVE,
            },
            relations: {
                pattern: true,
                sizes: {
                    size: true,
                },
            },
        });
    }
}
