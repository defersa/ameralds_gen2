import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSourceService } from '../data-source.service';
import { type EntityManager, Raw, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TokenService, SessionTokens } from './token.service';
import { UserProfileDto } from '../../modules/user/user.dto';
import { UserEntity, UserStatus } from '../entities/user.entity';
import { ModelState } from '../abstract/abstract.model';
import { ApiErrorCodes } from '../../modules/errors/errors.dto';

// Сравнение выполняется и для неизвестного email, чтобы не раскрывать наличие пользователя по времени ответа.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('invalid-user-password', 10);

@Injectable()
export class UserService {
    private userRepository: Repository<UserEntity>;

    constructor(private dataSource: DataSourceService, private tokenService: TokenService) {
        this.userRepository = this.dataSource.getRepository(UserEntity);
    }

    public getUserByEmail(email: string): Promise<UserEntity> {
        return this.userRepository.findOne({ where: { email: Raw(alias => 'LOWER(' + alias + ') = :email', { email: email.toLowerCase() }) } });
    }

    public getOrCreateUserWithoutPassword(email: string, manager: EntityManager): Promise<UserEntity> {
        return this.getOrCreateUser(email, manager, { passwordHash: null });
    }

    public getOrCreateRegisteredUser(email: string, passwordHash: string, manager: EntityManager): Promise<UserEntity> {
        return this.getOrCreateUser(email, manager, { passwordHash, status: UserStatus.VERIFIED });
    }

    private async getOrCreateUser(email: string, manager: EntityManager, credentials: { passwordHash: string | null; status?: UserStatus }): Promise<UserEntity> {
        if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID_EMAIL });
        }

        email = email.trim().toLowerCase();
        const repository = manager.getRepository(UserEntity);
        const options = {
            where: { email: Raw(alias => 'LOWER(' + alias + ') = :email', { email }) },
            lock: { mode: 'pessimistic_write' as const },
        };
        const user = await repository.findOne(options);

        if (user) {
            return user;
        }

        // Уникальный индекс email и ON CONFLICT защищают от одновременной регистрации.
        await repository.createQueryBuilder()
            .insert()
            .values({ email, username: email.split('@')[0], ...credentials })
            .orIgnore()
            .execute();

        return repository.findOneOrFail(options);
    }

    public async signIn(email: string, password: string): Promise<SessionTokens> {
        const user = await this.userRepository.findOne({
            where: { email: Raw(alias => 'LOWER(' + alias + ') = :email', { email: email.toLowerCase() }) },
            select: { id: true, passwordHash: true, state: true },
        });
        const validPassword = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !user.passwordHash || !validPassword || user.state !== ModelState.ACTIVE) {
            throw new UnauthorizedException({ code: ApiErrorCodes.INVALID_CREDENTIALS });
        }
        const tokens = await this.tokenService.createSession(user.id);
        if (!tokens) {
            throw new UnauthorizedException({ code: ApiErrorCodes.INVALID_CREDENTIALS });
        }
        return tokens;
    }

    public refreshToken(refresh: string): Promise<SessionTokens | null> {
        return this.tokenService.rotateRefreshToken(refresh);
    }

    public logout(refresh: string): Promise<void> {
        return this.tokenService.revokeSession(refresh);
    }

    public getUserByToken(token: string): Promise<UserEntity | null> {
        return this.tokenService.getUserByAccessToken(token);
    }

    public async getUser(id: number): Promise<UserProfileDto> {
        const user = await this.userRepository.findOne({
            where: { id, state: ModelState.ACTIVE },
            relations: { ownPatterns: { pattern: true, sizes: { size: true } } },
        });
        if (!user) {
            throw new UnauthorizedException({ code: ApiErrorCodes.UNAUTHORIZED });
        }
        return {
            id: user.id, createdAt: user.createdAt, updatedAt: user.updatedAt,
            email: user.email, username: user.username, role: user.role,
            ownPatterns: (user.ownPatterns ?? []).filter(item => item.state === ModelState.ACTIVE).map(item => ({
                id: item.id, createdAt: item.createdAt, updatedAt: item.updatedAt, color: item.color,
                pattern: item.pattern ? { id: item.pattern.id, createdAt: item.pattern.createdAt, updatedAt: item.pattern.updatedAt } : null,
                sizes: (item.sizes ?? []).filter(size => size.state === ModelState.ACTIVE).map(size => ({
                    id: size.id, createdAt: size.createdAt, updatedAt: size.updatedAt,
                    size: size.size ? { id: size.size.id, value: size.size.value, createdAt: size.size.createdAt } : null,
                })),
            })),
        };
    }
}
