import { existsSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { Attachment } from 'nodemailer/lib/mailer';
import sharp from 'sharp';
import { getUploadsPath, getUploadsRoot } from '../utils/path-with-dir';
import { MAIL_LOGO_CID } from './templates/layout.template';


let logoContent: Buffer | undefined;

export async function getMailLogo(): Promise<Attachment> {
    if (!logoContent) {
        const paths = [
            join(__dirname, 'mail/assets/amstore logo.svg'),
            resolve(__dirname, '../../../am-front/src/public/assets/amstore logo.svg'),
            resolve(process.cwd(), 'apps/am-front/src/public/assets/amstore logo.svg'),
        ];
        const logoPath = paths.find((path) => existsSync(path));

        if (!logoPath) {
            throw new Error('The Amstore mail logo is missing from the application assets');
        }

        logoContent = await sharp(logoPath).resize(188, 200).png().toBuffer();
    }

    return {
        filename: 'amstore-logo.png',
        content: logoContent,
        contentType: 'image/png',
        contentDisposition: 'inline',
        cid: MAIL_LOGO_CID,
    };
}

export async function getMailProductImage(path: string | undefined, cid: string): Promise<Attachment | undefined> {
    if (!path) {
        return undefined;
    }

    const imagePath = resolve(getUploadsPath(path));
    const publicPath = relative(resolve(getUploadsRoot(), 'public'), imagePath);

    if (publicPath.startsWith('..') || isAbsolute(publicPath)) {
        return undefined;
    }

    try {
        const content = await sharp(imagePath)
            .resize(432, 288, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer();

        return {
            filename: `${cid.split('@')[0]}.jpg`,
            content,
            contentType: 'image/jpeg',
            contentDisposition: 'inline',
            cid,
        };
    } catch {
        return undefined;
    }
}
