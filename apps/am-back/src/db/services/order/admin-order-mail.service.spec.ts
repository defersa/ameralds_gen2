import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HttpStatus } from '@nestjs/common';
import { AdminOrderEntity, UserOrderEntity } from '../../entities/purchases/order.entity';
import { AdminOrderMailService } from './admin-order-mail.service';
import { DataSourceService } from '../../data-source.service';
import { getMailLogo, getMailProductImage } from '../../../mail/mail-assets';
import { OrderPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';
import { PatternEntity } from '../../entities/patterns/pattern.entity';
import { PrivateFileEntity } from '../../entities/files/file.entity';
import { ModelState } from '../../abstract/abstract.model';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';
import { EmailLoginService } from '../email-login.service';
import { MailService } from '../../../mail/mail.service';


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
    let personalOrder: UserOrderEntity;
    let createLink: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'dev';
        sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
        createTransportMock.mockReturnValue({ sendMail } as unknown as Transporter);
        order = Object.assign(new AdminOrderEntity(), {
            id: 42,
            state: ModelState.ACTIVE,
            email: 'buyer@example.com',
            isComplete: true,
            patterns: [],
        });
        findOne = jest.fn().mockImplementation(async () => order);
        personalOrder = Object.assign(new UserOrderEntity(), { id: 17, user: { id: 9, email: 'buyer@example.com' } });
        createLink = jest.fn().mockResolvedValue('http://localhost:4400/auth/email#token=secret');
        service = new AdminOrderMailService({
            getRepository: jest.fn(entity => entity === AdminOrderEntity ? { findOne } : { findOne: jest.fn(async () => personalOrder) }),
        } as unknown as DataSourceService, { createLink } as unknown as EmailLoginService, new MailService());
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
            connectionTimeout: 30_000,
            greetingTimeout: 30_000,
            socketTimeout: 60_000,
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
            where: { id: 42, state: ModelState.ACTIVE },
            relations: expect.objectContaining({
                patterns: expect.objectContaining({
                    sizes: { size: true, cbb: true, pdf: true },
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

    it('adds a login link to the personal order using its owner and personal ID', async () => {
        await service.sendCompletedOrder(order);
        expect(createLink).toHaveBeenCalledWith(9, '/account/orders/17');
        expect(sendMail.mock.calls[0][0].html).toContain('Открыть заказ');
        expect(sendMail.mock.calls[0][0].text).toContain('http://localhost:4400/auth/email#token=secret');
    });

    it.each(['missing order', 'changed email'])('does not issue an account login link for a %s', async reason => {
        if (reason === 'missing order') personalOrder = null;
        else personalOrder.user.email = 'new-owner@example.com';
        await service.sendCompletedOrder(order);
        expect(createLink).not.toHaveBeenCalled();
        expect(sendMail.mock.calls[0][0].html).not.toContain('Открыть заказ');
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

    it('rejects a missing order without sending mail', async () => {
        findOne.mockResolvedValue(null);

        await expect(service.sendCompletedOrder(order)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
        });
        expect(sendMail).not.toHaveBeenCalled();
    });

    it('rejects an inactive order without sending mail', async () => {
        order.state = ModelState.INACTIVE;

        await expect(service.sendCompletedOrder(order)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
        });
        expect(sendMail).not.toHaveBeenCalled();
    });

    it('rejects an incomplete order without sending mail', async () => {
        order.isComplete = false;

        await expect(service.sendCompletedOrder(order)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.INVALID, entity: ApiEntityNames.CART },
        });
        expect(sendMail).not.toHaveBeenCalled();
    });

    describe('order file attachments', () => {
        let directory: string;
        let selectedSize: PatternSizeEntity;

        beforeAll(async () => {
            directory = await mkdtemp(join(tmpdir(), 'admin-order-mail-'));
        });

        afterAll(async () => {
            await rm(directory, { recursive: true, force: true });
        });

        beforeEach(() => {
            const file = (id: number, format: string) => Object.assign(new PrivateFileEntity(), {
                id,
                state: ModelState.ACTIVE,
                name: `pattern-36.${format}`,
                path: join(directory, `${id}.${format}`),
            });
            selectedSize = Object.assign(new PatternSizeEntity(), {
                id: 21,
                state: ModelState.ACTIVE,
                size: { id: 3, value: 36 },
                cbb: file(11, 'cbb'),
                pdf: file(13, 'pdf'),
                png: file(14, 'png'),
            });
            order.patterns = [Object.assign(new OrderPatternEntity(), {
                id: 31,
                state: ModelState.ACTIVE,
                sizes: [selectedSize],
                color: false,
                requiresPatternPurchase: true,
                pattern: Object.assign(new PatternEntity(), {
                    id: 7,
                    name: { ru: 'Волны', en: 'Waves' },
                    images: [],
                    categories: [],
                    basePrice: { ru: 100, en: 1 },
                    additionalPrice: { ru: 10, en: 0.1 },
                    colorPrice: { ru: 25, en: 0.25 },
                    sizes: [selectedSize, Object.assign(new PatternSizeEntity(), {
                        id: 22,
                        state: ModelState.ACTIVE,
                        size: { id: 5, value: 40 },
                        cbb: file(15, 'cbb'),
                        pdf: file(16, 'pdf'),
                    })],
                }),
            })];
        });

        it('attaches only CBB/PDF from selected sizes with their original names and preserves inline images', async () => {
            jest.mocked(getMailProductImage).mockResolvedValue({
                filename: 'preview.jpg',
                content: Buffer.from('preview'),
                cid: 'order-42-item-0@ameralds',
            });

            await service.sendCompletedOrder(order);

            expect(sendMail.mock.calls[0][0].attachments).toEqual([
                expect.objectContaining({ filename: 'amstore-logo.png', cid: 'amstore-logo@ameralds' }),
                {
                    filename: 'pattern-36.cbb',
                    path: selectedSize.cbb.path,
                    contentType: 'application/octet-stream',
                    contentDisposition: 'attachment',
                },
                {
                    filename: 'pattern-36.pdf',
                    path: selectedSize.pdf.path,
                    contentType: 'application/pdf',
                    contentDisposition: 'attachment',
                },
                expect.objectContaining({ filename: 'preview.jpg', cid: 'order-42-item-0@ameralds' }),
            ]);
        });

        it.each(['item', 'size', 'file'])('excludes inactive %s attachments', async (entity) => {
            if (entity === 'item') {
                order.patterns[0].state = ModelState.INACTIVE;
            } else if (entity === 'size') {
                selectedSize.state = ModelState.INACTIVE;
            } else {
                selectedSize.cbb.state = ModelState.INACTIVE;
            }

            await service.sendCompletedOrder(order);

            const filenames = sendMail.mock.calls[0][0].attachments.map((attachment) => attachment.filename);
            expect(filenames).toEqual(entity === 'file'
                ? ['amstore-logo.png', 'pattern-36.pdf']
                : ['amstore-logo.png']);
        });

        it('does not attach a file more than once when order items share it', async () => {
            order.patterns.push(Object.assign(new OrderPatternEntity(), { ...order.patterns[0], id: 32 }));

            await service.sendCompletedOrder(order);

            expect(sendMail.mock.calls[0][0].attachments.map((attachment) => attachment.filename)).toEqual([
                'amstore-logo.png', 'pattern-36.cbb', 'pattern-36.pdf',
            ]);
        });

        it('handles absent CBB and PDF relations without attaching PNG', async () => {
            selectedSize.cbb = null;
            selectedSize.pdf = null;

            await service.sendCompletedOrder(order);

            expect(sendMail.mock.calls[0][0].attachments).toHaveLength(1);
        });

        it('builds original binary attachments from disk again on repeated sending', async () => {
            const cbb = Buffer.from([0, 1, 255, 30, 4]);
            const pdf = Buffer.from('%PDF-1.7\norder-file');
            await Promise.all([
                writeFile(selectedSize.cbb.path, cbb),
                writeFile(selectedSize.pdf.path, pdf),
            ]);
            const messages: Buffer[] = [];
            sendMail.mockImplementation(async (message) => {
                messages.push(await new MailComposer(message).compile().build());
            });

            await service.sendCompletedOrder(order);
            await service.sendCompletedOrder(order);

            expect(messages).toHaveLength(2);
            for (const message of messages) {
                const content = message.toString();
                expect(content).toContain('Content-Type: application/octet-stream');
                expect(content).toContain('Content-Type: application/pdf');
                expect(content).toMatch(/Content-Disposition: attachment; filename="?pattern-36\.cbb/i);
                expect(content).toMatch(/Content-Disposition: attachment; filename="?pattern-36\.pdf/i);
                expect(content).toContain(cbb.toString('base64'));
                expect(content).toContain(pdf.toString('base64'));
            }
        });

        it('reports a missing file on disk instead of silently omitting the attachment', async () => {
            selectedSize.cbb.path = join(directory, 'missing.cbb');
            selectedSize.pdf = null;
            sendMail.mockImplementation((message) => new MailComposer(message).compile().build());

            await expect(service.sendCompletedOrder(order)).rejects.toMatchObject({ code: 'ENOENT' });
        });
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
