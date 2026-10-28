import { createTransport } from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('shared mail transport', () => {
    const keys = ['NODE_ENV', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    const sendMail = jest.fn().mockResolvedValue({});

    beforeEach(() => {
        jest.clearAllMocks();
        for (const key of keys) delete process.env[key];
        jest.mocked(createTransport).mockReturnValue({ sendMail } as unknown as ReturnType<typeof createTransport>);
    });
    afterEach(() => {
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    });

    it('uses Mailpit in development and reuses the connection configuration', async () => {
        process.env.NODE_ENV = 'dev';
        const service = new MailService();
        await service.send({ to: 'buyer@example.com', subject: 'Test' });
        await service.send({ to: 'buyer@example.com', subject: 'Again' });
        expect(createTransport).toHaveBeenCalledTimes(1);
        expect(createTransport).toHaveBeenCalledWith({ host: '127.0.0.1', port: 1025, secure: false, connectionTimeout: 30_000, greetingTimeout: 30_000, socketTimeout: 60_000 });
    });

    it('uses configured SMTP credentials and sender in production', async () => {
        Object.assign(process.env, { NODE_ENV: 'production', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'mail-user', SMTP_PASSWORD: 'mail-password', MAIL_FROM: 'Shop <shop@example.com>' });
        await new MailService().send({ to: 'buyer@example.com', text: 'Login link' });
        expect(createTransport).toHaveBeenCalledWith({ host: 'smtp.example.com', port: 465, secure: true, auth: { user: 'mail-user', pass: 'mail-password' }, connectionTimeout: 30_000, greetingTimeout: 30_000, socketTimeout: 60_000 });
        expect(sendMail).toHaveBeenCalledWith({ from: 'Shop <shop@example.com>', to: 'buyer@example.com', text: 'Login link' });
    });

    it('fails explicitly when SMTP is not configured outside development', async () => {
        process.env.NODE_ENV = 'production';
        await expect(new MailService().send({ to: 'buyer@example.com' })).rejects.toThrow('SMTP_HOST');
        expect(sendMail).not.toHaveBeenCalled();
    });
});
