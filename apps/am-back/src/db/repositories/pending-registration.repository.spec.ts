import { ModelState } from '../abstract/abstract.model';
import { DataSourceService } from '../data-source.service';
import { EmailLoginLinkEntity } from '../entities/tokens/email-login-link.entity';
import { PendingRegistrationRepository } from './pending-registration.repository';


describe('PendingRegistrationRepository', () => {
    const linked = { existsBy: jest.fn() };
    const getRepository = jest.fn();
    let repository: PendingRegistrationRepository;

    beforeEach(() => {
        jest.resetAllMocks();
        jest.useFakeTimers().setSystemTime(new Date('2026-11-10T12:00:00Z'));
        linked.existsBy.mockResolvedValue(false);
        getRepository.mockReturnValue(linked);

        repository = new PendingRegistrationRepository({
            getRepository,
        } as unknown as DataSourceService);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('checks the normalized email without selecting password hashes', async () => {
        linked.existsBy.mockResolvedValue(true);

        await expect(repository.hasActiveLinkForEmail(' BUYER@Example.com ')).resolves.toBe(true);

        expect(getRepository).toHaveBeenCalledWith(EmailLoginLinkEntity);
        expect(linked.existsBy).toHaveBeenCalledWith({
            registrationEmail: 'buyer@example.com',
            state: ModelState.ACTIVE,
            expiredAt: expect.anything(),
        });
    });

    it('excludes used links and links expired at or before the current time', async () => {
        await repository.hasActiveLinkForEmail('buyer@example.com');

        const criteria = linked.existsBy.mock.calls[0][0];

        expect(criteria.state).toBe(ModelState.ACTIVE);
        expect(criteria.expiredAt.type).toBe('moreThan');
        expect(criteria.expiredAt.value.valueOf()).toBe(Date.now());
    });

    it('returns false when no active registration link exists', async () => {
        await expect(repository.hasActiveLinkForEmail('unknown@example.com')).resolves.toBe(false);
    });
});
