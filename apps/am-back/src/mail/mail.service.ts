import { Injectable } from '@nestjs/common';
import type { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private transporter?: Transporter;

    public get configured(): boolean {
        return process.env.NODE_ENV === 'dev' || Boolean(process.env.SMTP_HOST);
    }

    public async send(message: SendMailOptions): Promise<void> {
        if (!this.configured) {
            throw new Error('Configure SMTP_HOST and MAIL_FROM to send email');
        }

        if (!this.transporter) {
            const { createTransport } = await import('nodemailer');
            this.transporter = createTransport({
                host: process.env.SMTP_HOST || '127.0.0.1',
                port: Number(process.env.SMTP_PORT || (process.env.NODE_ENV === 'dev' ? 1025 : 587)),
                secure: process.env.SMTP_SECURE === 'true',
                connectionTimeout: 30_000,
                greetingTimeout: 30_000,
                socketTimeout: 60_000,
                ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}),
            });
        }

        const from = process.env.MAIL_FROM || (process.env.NODE_ENV === 'dev' ? 'Ameralds <no-reply@ameralds.test>' : undefined);
        if (!from) {
            throw new Error('Configure MAIL_FROM to send email');
        }
        await this.transporter.sendMail({ ...message, from });
    }
}
