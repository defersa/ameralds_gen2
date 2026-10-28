import { HttpStatus } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ModelState } from '../abstract/abstract.model';
import { DataSourceService } from '../data-source.service';
import { UserEntity, UserRole, UserStatus } from '../entities/user.entity';
import { ApiErrorCodes } from '../../modules/errors/errors.dto';
import { TokenService } from './token.service';
import { UserService } from './user.service';

describe('UserService.getOrCreateUserWithoutPassword', () => {
    let service: UserService;
    let manager: EntityManager;
    let user: UserEntity;
    let repository: {
        findOne: jest.Mock;
        findOneOrFail: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let insert: { insert: jest.Mock; values: jest.Mock; orIgnore: jest.Mock; execute: jest.Mock };

    beforeEach(() => {
        user = Object.assign(new UserEntity(), {
            id: 42, email: 'Buyer@Example.com', username: 'Existing name',
            passwordHash: 'existing-hash', role: UserRole.ADMIN,
            status: UserStatus.VERIFIED, state: ModelState.ACTIVE,
        });
        insert = {
            insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(),
            orIgnore: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}),
        };
        repository = {
            findOne: jest.fn().mockResolvedValue(user),
            findOneOrFail: jest.fn().mockResolvedValue(user),
            createQueryBuilder: jest.fn().mockReturnValue(insert),
        };
        manager = { getRepository: jest.fn().mockReturnValue(repository) } as unknown as EntityManager;
        service = new UserService({ getRepository: jest.fn() } as unknown as DataSourceService, {} as TokenService);
    });

    it('finds and locks an existing account without changing its credentials or profile', async () => {
        const snapshot = { ...user };

        await expect(service.getOrCreateUserWithoutPassword(' BUYER@example.COM ', manager)).resolves.toBe(user);

        const options = repository.findOne.mock.calls[0][0];
        expect(options.where.email.objectLiteralParameters).toEqual({ email: 'buyer@example.com' });
        expect(options.where.email.getSql('email')).toBe('LOWER(email) = :email');
        expect(options.lock).toEqual({ mode: 'pessimistic_write' });
        expect(user).toEqual(snapshot);
        expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('creates an account without a password, using the database defaults for role and status', async () => {
        repository.findOne.mockResolvedValue(null);
        const newUser = Object.assign(new UserEntity(), {
            id: 43, email: 'buyer@example.com', username: 'buyer', passwordHash: null,
            role: UserRole.COMMON, status: UserStatus.REGISTERED, state: ModelState.ACTIVE,
        });
        repository.findOneOrFail.mockResolvedValue(newUser);

        await expect(service.getOrCreateUserWithoutPassword(' BUYER@example.com ', manager)).resolves.toBe(newUser);

        expect(insert.values).toHaveBeenCalledWith({ email: 'buyer@example.com', username: 'buyer', passwordHash: null });
        expect(insert.orIgnore).toHaveBeenCalledTimes(1);
        expect(repository.findOneOrFail).toHaveBeenCalledWith(repository.findOne.mock.calls[0][0]);
    });

    it('uses the account created concurrently by registration without overwriting it', async () => {
        repository.findOne.mockResolvedValue(null);

        await expect(service.getOrCreateUserWithoutPassword('buyer@example.com', manager)).resolves.toBe(user);

        expect(user.passwordHash).toBe('existing-hash');
        expect(user.username).toBe('Existing name');
        expect(insert.orIgnore).toHaveBeenCalled();
    });

    it('preserves the state of an inactive account', async () => {
        user.state = ModelState.INACTIVE;

        await expect(service.getOrCreateUserWithoutPassword(user.email, manager)).resolves.toBe(user);
        expect(user.state).toBe(ModelState.INACTIVE);
        expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('creates a verified account with the confirmed password hash', async () => {
        repository.findOne.mockResolvedValue(null);
        await service.getOrCreateRegisteredUser(' BUYER@example.com ', 'confirmed-hash', manager);
        expect(insert.values).toHaveBeenCalledWith({
            email: 'buyer@example.com', username: 'buyer', passwordHash: 'confirmed-hash', status: UserStatus.VERIFIED,
        });
    });

    it.each(['existing-hash', null])('keeps existing credentials (%s) when confirming another registration', async hash => {
        user.passwordHash = hash;
        await expect(service.getOrCreateRegisteredUser(user.email, 'replacement-hash', manager)).resolves.toBe(user);
        expect(user.passwordHash).toBe(hash);
        expect(user.role).toBe(UserRole.ADMIN);
        expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it.each(['invalid', 'buyer@invalid', 'buyer @example.com', 'x'.repeat(243) + '@example.com', null, 42])(
        'rejects an invalid email (%s) before accessing accounts', async email => {
            await expect(service.getOrCreateUserWithoutPassword(email as string, manager)).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST, response: { code: ApiErrorCodes.INVALID_EMAIL },
            });
            expect(repository.findOne).not.toHaveBeenCalled();
            expect(repository.createQueryBuilder).not.toHaveBeenCalled();
        },
    );
});
