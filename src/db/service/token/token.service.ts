import { Injectable, Scope } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TokenEntity } from "@am/db/entities/tokens/token.entity";
import { Repository } from "typeorm";
import { DataSourceService } from "@am/db/data-source.service";


@Injectable({
    scope: Scope.TRANSIENT,
})
export class TokenService {
    private tokenRepository: Repository<TokenEntity>;

    constructor(
        private jwtService: JwtService,
        private dataSource: DataSourceService,
    ) {
        this.tokenRepository = this.dataSource.getRepository<TokenEntity>(TokenEntity);

    }

    public async createToken(payload: Record<string, unknown>, expiredAt: Date): Promise<TokenEntity> {
        const token: TokenEntity = this.tokenRepository.create();

        token.value = this.jwtService.sign(payload);
        token.expiredAt = expiredAt;

        await this.tokenRepository.save(token);

        return token;
    }
}
