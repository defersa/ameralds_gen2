import { Injectable, Scope } from "@nestjs/common";
import { DataSourceService } from "../data-source.service";
import { FindOneOptions, Repository } from "typeorm";
import { TokenAccessEntity, TokenRefreshEntity, UserEntity } from "@am/db/entities";
import * as bcrypt from "bcrypt";
import { TokenService } from "@am/db/service/token.service";
import { addDays } from "date-fns";
import { UserTokensDTO } from "../../modules/user/user.dto";


@Injectable({
    scope: Scope.DEFAULT
})
export class UserService {
    private userRepository: Repository<UserEntity>;

    constructor(
        private dataSource: DataSourceService,
        private tokenService: TokenService
    ) {
        this.userRepository = this.dataSource.getRepository<UserEntity>(UserEntity);
    }

    public getUserByEmail(email: string): Promise<UserEntity> {
        return this.userRepository.findOne({
            where: { email }
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
            }
        } as FindOneOptions<UserEntity>);
    }
}
