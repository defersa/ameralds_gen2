import { DataSourceService } from '../../data-source.service';
import { AppSettingsService } from './app-settings.service';

describe('AppSettingsService reads', () => {
    it('uses max version and does not cache another instance’s changes', async () => {
        const findOne = jest.fn().mockResolvedValueOnce({ version: 5, snapshot: {} })
            .mockResolvedValueOnce({ version: 6, snapshot: { orders: { paymentExpirationDays: 14 } } });
        const settings = new AppSettingsService({ dataSource: { manager: { getRepository: () => ({ findOne }) } } } as unknown as DataSourceService);
        await expect(settings.getRaw('orders.paymentExpirationDays')).resolves.toBeUndefined();
        await expect(settings.get('orders.paymentExpirationDays')).resolves.toBe(14);
        expect(findOne).toHaveBeenCalledWith({ where: {}, order: { version: 'DESC' } });
    });

    it('does not mask database failures with defaults or attempt initialization', async () => {
        const transaction = jest.fn();
        const error = new Error('DB unavailable');
        const settings = new AppSettingsService({ dataSource: {
            manager: { getRepository: () => ({ findOne: async () => { throw error; } }) }, transaction,
        } } as unknown as DataSourceService);
        await expect(settings.onModuleInit()).rejects.toBe(error);
        expect(transaction).not.toHaveBeenCalled();
    });

    it('does not substitute defaults for corrupt known fields', async () => {
        const settings = new AppSettingsService({ dataSource: { manager: { getRepository: () => ({
            findOne: async () => ({ version: 1, snapshot: { orders: { paymentExpirationDays: '7' } } }),
        }) } } } as unknown as DataSourceService);
        await expect(settings.get('orders.paymentExpirationDays')).rejects.toThrow('Invalid stored setting');
    });
});
