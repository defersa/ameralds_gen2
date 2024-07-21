import { Injectable, Scope } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { TokenAccessEntity, TokenEntity, TokenRefreshEntity } from "@am/db/entities";
import { DataSourceService } from "../../data-source.service";


@Injectable({
    scope: Scope.DEFAULT,
})
export class TokenService {
    private tokenAccessRepository: Repository<TokenAccessEntity>;
    private tokenRefreshRepository: Repository<TokenRefreshEntity>;

    constructor(
        private jwtService: JwtService,
        private dataSource: DataSourceService,
    ) {
        this.tokenAccessRepository = this.dataSource.getRepository<TokenAccessEntity>(TokenAccessEntity);
        this.tokenRefreshRepository = this.dataSource.getRepository<TokenRefreshEntity>(TokenRefreshEntity);

    }

    public async createAccessToken(payload: Record<string, unknown>, expiredAt: Date): Promise<TokenAccessEntity> {
        const token: TokenAccessEntity = this.tokenAccessRepository.create();

        console.log(token.value);

        token.value = this.jwtService.sign({ ...payload, expiredAt });
        token.expiredAt = expiredAt;

        await this.tokenAccessRepository.save(token);

        return token;
    }

    public async refreshAccessToken(payload: Record<string, unknown>, expiredAt: Date): Promise<TokenRefreshEntity> {
        const token: TokenRefreshEntity = this.tokenRefreshRepository.create();

        token.value = this.jwtService.sign({ ...payload, expiredAt });
        token.expiredAt = expiredAt;

        await this.tokenRefreshRepository.save(token);

        return token;
    }
}
