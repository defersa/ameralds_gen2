import { createHash } from 'node:crypto';
import { DataSourceService } from '../data-source.service';
import { AUTH_EMAIL_LIMITS, AuthEmailLimitService } from './auth-email-limit.service';

describe('shared authentication email limits', () => {
    let service: AuthEmailLimitService;
    let query: jest.Mock;

    beforeEach(() => {
        query = jest.fn().mockResolvedValue([{ count: 1, retryAfter: 60 }]);
        service = new AuthEmailLimitService({ dataSource: { transaction: async callback => callback({ query }) } } as unknown as DataSourceService);
    });

    it('normalizes email and updates every bucket atomically in a consistent lock order without storing IP or email', async () => {
        await expect(service.consume(' Buyer@Example.com ', '127.0.0.1')).resolves.toBe(0);
        const keys = query.mock.calls.map(([, [key]]) => key);
        expect(keys).toEqual([...keys].sort());
        expect(keys).toHaveLength(AUTH_EMAIL_LIMITS.length);
        expect(keys).toContain(createHash('sha256').update('auth-email:email-short:buyer@example.com').digest('hex'));
        expect(JSON.stringify(query.mock.calls)).not.toMatch(/buyer@example.com|127\.0\.0\.1/);
        expect(query.mock.calls.every(([sql]) => sql.includes('ON CONFLICT'))).toBe(true);
    });

    it('returns the longest retry interval when any bucket is exhausted and still updates all buckets', async () => {
        query.mockResolvedValueOnce([{ count: 1_000, retryAfter: 90 }]).mockResolvedValueOnce([{ count: 1_000, retryAfter: 180 }]);
        await expect(service.consume('unknown@example.com', '127.0.0.1')).resolves.toBe(180);
        expect(query).toHaveBeenCalledTimes(AUTH_EMAIL_LIMITS.length);
    });
});
