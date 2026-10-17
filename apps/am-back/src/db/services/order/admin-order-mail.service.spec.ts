import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AdminOrderEntity } from '../../entities/purchases/order.entity';
import { AdminOrderMailService } from './admin-order-mail.service';
import { DataSourceService } from '../../data-source.service';
import { getMailLogo, getMailProductImage } from '../../../mail/mail-assets';
import { OrderPatternEntity } from '../../entities/patterns/pattern-order.entity';


jest.mock('nodemailer', () => ({
    createTransport: jest.fn(),
}));

jest.mock('../../../mail/mail-assets', () => ({
    getMailLogo: jest.fn(),
    getMailProductImage: jest.fn(),
}));

describe('AdminOrderMailService', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const createTransportMock = jest.mocked(createTransport);
    let sendMail: jest.Mock;
    let service: AdminOrderMailService;
    let order: AdminOrderEntity;
    let findOne: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'dev';
        sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
        createTransportMock.mockReturnValue({ sendMail } as unknown as Transporter);
        order = Object.assign(new AdminOrderEntity(), {
            id: 42,
            email: 'buyer@example.com',
            isComplete: true,
            patterns: [],
        });
        findOne = jest.fn().mockImplementation(async () => order);
        service = new AdminOrderMailService({
            getRepository: jest.fn().mockReturnValue({ findOne }),
        } as unknown as DataSourceService);
        jest.mocked(getMailLogo).mockResolvedValue({
            filename: 'amstore-logo.png',
            content: Buffer.from('logo'),
            cid: 'amstore-logo@ameralds',
        });
        jest.mocked(getMailProductImage).mockResolvedValue(undefined);
    });

    afterEach(() => {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
    });

    it('sends a completed order through Mailpit in dev and reuses the transport', async () => {
        await service.sendCompletedOrder(order);
        await service.sendCompletedOrder(order);

        expect(createTransportMock).toHaveBeenCalledTimes(1);
        expect(createTransportMock).toHaveBeenCalledWith({
            host: '127.0.0.1',
            port: 1025,
            secure: false,
        });
        expect(sendMail).toHaveBeenCalledTimes(2);
        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'Ameralds <no-reply@ameralds.test>',
            to: 'buyer@example.com',
            subject: 'Заказ №42 оформлен',
            text: expect.stringContaining('Заказ №42 оформлен'),
            html: expect.stringContaining('cid:amstore-logo@ameralds'),
            attachments: expect.arrayContaining([
                expect.objectContaining({ filename: 'amstore-logo.png' }),
            ]),
        }));
    });

    it('loads order presentation data, embeds the first preview and renders selected sizes and prices', async () => {
        order.patterns = [{
            id: 7,
            pattern: {
                name: { ru: 'Волны' },
                images: [
                    { id: 2, index: 1, preview: 'uploads/public/second.webp' },
                    { id: 1, index: 0, preview: 'uploads/public/first.webp' },
                ],
                categories: [{ label: { ru: 'Радуга' } }],
                basePrice: { ru: 300, en: 3 },
                additionalPrice: { ru: 50, en: 0.5 },
                colorPrice: { ru: 100, en: 1 },
            },
            sizes: [{ size: { value: 33 } }, { size: { value: 31 } }],
            color: true,
            requiresPatternPurchase: true,
        } as OrderPatternEntity];
        jest.mocked(getMailProductImage).mockResolvedValue({
            filename: 'preview.jpg',
            content: Buffer.from('preview'),
            cid: 'order-42-item-0@ameralds',
        });

        await service.sendCompletedOrder(order);

        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 42 },
            relations: expect.objectContaining({
                patterns: expect.objectContaining({
                    sizes: { size: true },
                    pattern: expect.objectContaining({ name: true, images: true, categories: { label: true } }),
                }),
            }),
        }));
        expect(getMailProductImage).toHaveBeenCalledWith('uploads/public/first.webp', 'order-42-item-0@ameralds');
        const message = sendMail.mock.calls[0][0];
        expect(message.html).toContain('Волны');
        expect(message.html).toContain('Радуга');
        expect(message.html).toContain('cid:order-42-item-0@ameralds');
        expect(message.text).toContain('Размеры: 31, 33');
        expect(message.text).toContain('Подбор: включён');
        expect(message.text).toMatch(/Итого: 500\s₽/);
        expect(message.attachments).toHaveLength(2);
    });

    it('keeps the order readable if the pattern or its image is unavailable', async () => {
        order.patterns = [{ pattern: null, sizes: [], color: false } as OrderPatternEntity];

        await service.sendCompletedOrder(order);

        const message = sendMail.mock.calls[0][0];
        expect(message.html).toContain('Схема недоступна');
        expect(message.html).toContain('Изображение недоступно');
        expect(message.html).not.toContain('cid:order-42-item-0@ameralds');
        expect(message.attachments).toHaveLength(1);
    });

    it.each(['prod', 'production', 'test', undefined])(
        'does not create a transport or send mail when NODE_ENV=%s',
        async (environment) => {
            if (environment === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = environment;
            }

            await service.sendCompletedOrder(order);

            expect(createTransportMock).not.toHaveBeenCalled();
            expect(sendMail).not.toHaveBeenCalled();
            expect(findOne).not.toHaveBeenCalled();
        },
    );

    it.each([undefined, '', '   '])(
        'skips orders without a recipient (%s)',
        async (email) => {
            order.email = email;

            await service.sendCompletedOrder(order);

            expect(createTransportMock).not.toHaveBeenCalled();
            expect(sendMail).not.toHaveBeenCalled();
        },
    );
});
