import { Injectable } from "@nestjs/common";
import { type EntityManager, Repository } from "typeorm";
import { DataSourceService } from "../../data-source.service";
import { ModelState } from "../../abstract/abstract.model";
import { OrderPatternEntity, UserPatternEntity } from "../../entities/patterns/pattern-order.entity";
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

    // Вызывается в транзакции с заблокированной строкой пользователя.
    public async addBoughtPatterns(user: UserEntity, patterns: OrderPatternEntity[], manager: EntityManager): Promise<void> {
        const repository = manager.getRepository(UserPatternEntity);
        const boughtPatterns = await repository.find({
            where: { user: { id: user.id }, state: ModelState.ACTIVE },
            relations: { pattern: true, sizes: true },
        });
        const boughtByPattern = new Map(
            boughtPatterns.filter(item => item.pattern).map(item => [item.pattern.id, item]),
        );

        for (const item of patterns) {
            if (item.state !== ModelState.ACTIVE || item.pattern?.state !== ModelState.ACTIVE) {
                continue;
            }

            let bought = boughtByPattern.get(item.pattern.id);

            if (!bought) {
                bought = repository.create({ user, pattern: item.pattern, sizes: [], color: false });
                boughtByPattern.set(item.pattern.id, bought);
            }

            const sizes = new Map((bought.sizes ?? []).map(size => [size.id, size]));

            for (const size of item.sizes ?? []) {
                if (size.state === ModelState.ACTIVE && !sizes.has(size.id)) {
                    sizes.set(size.id, size);
                }
            }

            const color = bought.color || item.color;

            if (!bought.id || sizes.size !== (bought.sizes ?? []).length || color !== bought.color) {
                bought.sizes = [...sizes.values()];
                bought.color = color;
                await repository.save(bought);
            }
        }
    }
}
