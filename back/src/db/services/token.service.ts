import { Injectable, Scope } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { TokenAccessEntity, TokenEntity, TokenRefreshEntity } from "@am/db/entities";
import { DataSourceService } from "../data-source.service";
import { ModelState } from "../abstract/abstract.model";


@Injectable({
    scope: Scope.DEFAULT,
})
export class TokenService {
    private tokenAccessRepository: Repository<TokenAccessEntity>;
    private tokenRefreshRepository: Repository<TokenRefreshEntity>;
    private tokenRepository: Repository<TokenEntity>;

    constructor(
        private jwtService: JwtService,
        private dataSource: DataSourceService,
    ) {
        this.tokenAccessRepository = this.dataSource.getRepository<TokenAccessEntity>(TokenAccessEntity);
        this.tokenRefreshRepository = this.dataSource.getRepository<TokenRefreshEntity>(TokenRefreshEntity);
        this.tokenRepository = this.dataSource.getRepository<TokenEntity>(TokenEntity);

    }

    public async createAccessToken(payload: Record<string, unknown>, expiredAt: Date): Promise<TokenAccessEntity> {
        const token: TokenAccessEntity = this.tokenAccessRepository.create();

        token.value = this.jwtService.sign({ ...payload, expiredAt });
        token.expiredAt = expiredAt;

        await this.tokenAccessRepository.save(token);

        return token;
    }

    public async createRefreshToken(payload: Record<string, unknown>, expiredAt: Date): Promise<TokenRefreshEntity> {
        const token: TokenRefreshEntity = this.tokenRefreshRepository.create();

        token.value = this.jwtService.sign({ ...payload, expiredAt });
        token.expiredAt = expiredAt;

        await this.tokenRefreshRepository.save(token);

        return token;
    }

    public async getRefreshToken(token: string): Promise<TokenRefreshEntity> {
        const payload: Record<string, string> = this.decodeToken(token);
        const userId: number = Number(payload.userId);

        if (!userId) {
            return;
        }

        const tokenRefresh: TokenRefreshEntity = await this.tokenRefreshRepository.findOne({
            where: {
                value: token,
                state: ModelState.ACTIVE,
                user: {
                    id: userId,
                },
            },
        });

        if (!tokenRefresh) {
            return null;
        }

        if (tokenRefresh.expiredAt < new Date()) {
            tokenRefresh.state = ModelState.INACTIVE;

            await this.tokenRefreshRepository.save(tokenRefresh);

            return null;
        }

        return tokenRefresh;
    }

    public decodeToken(token: string): Record<string, string> {
        return this.jwtService.decode(token);
    }

    public async deactivateToken(token: string): Promise<void> {
        const tokenEntity: TokenEntity = await this.tokenRepository.findOne({
            where: {
                value: token,
                state: ModelState.ACTIVE,
            },
        });

        if (tokenEntity) {
            tokenEntity.state = ModelState.INACTIVE;

            await this.tokenRepository.save(tokenEntity);
        }

    }
}
