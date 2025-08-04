import { Injectable, Scope } from "@nestjs/common";
import { DataSourceService } from "../data-source.service";
import { FindOneOptions, Repository } from "typeorm";
import {
    OrderPatternEntity,
    OrderStatus, PatternSizeEntity,
    TokenAccessEntity,
    TokenRefreshEntity,
    UserEntity,
    UserOrderEntity
} from "@am/db/entities";
import * as bcrypt from "bcrypt";
import { TokenService } from "@am/db/service/token.service";
import { OrderService } from "@am/db/service/general/order.service";
import { addDays } from "date-fns";
import { UserProfileDto, UserTokensDTO } from "../../modules/user/user.dto";
import { instanceToPlain } from "class-transformer";
import { UserOrderDto } from "../../modules/orders/orders.dto";


@Injectable({
    scope: Scope.DEFAULT
})
export class UserService {
    private userRepository: Repository<UserEntity>;

    constructor(
        private dataSource: DataSourceService,
        private tokenService: TokenService,
        private orderService: OrderService,
    ) {
        this.userRepository = this.dataSource.getRepository<UserEntity>(UserEntity);
    }

    public getUserByEmail(email: string): Promise<UserEntity> {
        return this.userRepository.findOne({
            where: { email },
            relations: {
                access: true,
                refresh: true,
            }
        });
    }

    public async creatUser(email: string, password: string): Promise<UserEntity> {
        const passwordHash: string = await bcrypt.hash(password, await bcrypt.genSalt());

        const user: UserEntity = this.userRepository.create({
            passwordHash,
            email,
            username: email.split("@")[0]
        });

        await this.userRepository.save(user);

        return user;
    }

    public async createAccessToken(user: UserEntity): Promise<UserTokensDTO> {
        const accessTokenExpiredAt: Date = addDays(new Date(), 7);
        const refreshTokenExpiredAt: Date = addDays(new Date(), 28);
        const accessToken: TokenAccessEntity = await this.tokenService.createAccessToken({
            userId: user.id,
        }, accessTokenExpiredAt);

        const refreshToken: TokenRefreshEntity = await this.tokenService.createRefreshToken({
            userId: user.id,
        }, refreshTokenExpiredAt);

        user.access = [...(user.access ?? []), accessToken];
        user.refresh = [...(user.refresh ?? []), refreshToken];

        await this.userRepository.save(user);

        return {
            access: accessToken.value,
            refresh: refreshToken.value
        };
    }

    public async refreshToken(previousAccess: string, refreshToken: string): Promise<UserTokensDTO> {
        await this.tokenService.deactivateToken(previousAccess);

        const refreshTokenEntity: TokenRefreshEntity = await this.tokenService.getRefreshToken(refreshToken);

        if (!refreshTokenEntity) {
            return null;
        }

        const payload: Record<string, string> = this.tokenService.decodeToken(refreshToken);
        const user: UserEntity = await this.userRepository.findOneBy({
            id: Number(payload.userId),
        });

        const accessTokenExpiredAt: Date = addDays(new Date(), 7);

        const accessToken: TokenAccessEntity = await this.tokenService.createAccessToken({
            userId: user.id,
        }, accessTokenExpiredAt);

        user.access = [...(user.access ?? []), accessToken];
        await this.userRepository.save(user);

        return {
            access: accessToken.value,
            refresh: refreshTokenEntity.value,
        };
    }

    public async logout(user: UserEntity, access: string, refresh: string): Promise<void> {
        const accessEntity: TokenAccessEntity = user.access.find((token: TokenAccessEntity) => token.value === access);
        const refreshEntity: TokenRefreshEntity = user.refresh.find((token: TokenRefreshEntity) => token.value === refresh);

        await this.tokenService.setTokenInactive(accessEntity);
        await this.tokenService.setTokenInactive(refreshEntity);
    }

    public async getUserByToken(token: string): Promise<UserEntity> {
        const decodedToken: Record<string, string> = this.tokenService.decodeToken(token);
        const expiredAt: Date = new Date(decodedToken.expiredAt);

        if (expiredAt < new Date()) {
            await this.tokenService.deactivateToken(token);

            return null;
        }

        return await this.userRepository.findOne({
            where: {
                access: {
                    value: token
                }
            },
            relations: {
                access: true,
                refresh: true,
            }
        } as FindOneOptions<UserEntity>);
    }

    public async getUser(id: number): Promise<UserProfileDto> {
        const userEntity: UserEntity = await this.userRepository.findOne({
            where: {
                id,
            },
            relations: {
                orders: true,
                ownPatterns: {
                    pattern: true,
                    sizes: true,
                },
            },
            select: {
                orders: {
                    status: true,
                }
            }
        });

        const plainUser: UserProfileDto = instanceToPlain(userEntity) as UserProfileDto;

        if (userEntity.orders.every((order: UserOrderEntity) => order.status !== OrderStatus.OPEN)) {
            await this.orderService.createOrder(userEntity);
        }

        const cart: UserOrderEntity = await this.orderService.getOpenUserOrder(userEntity);
        plainUser.cart = {
            ...cart,
            patterns: cart.patterns.map((pattern: OrderPatternEntity) => ({ ...pattern, sizes: pattern.sizes.map((size: PatternSizeEntity) => size.id) })),
        };

        return plainUser;
    }
}
