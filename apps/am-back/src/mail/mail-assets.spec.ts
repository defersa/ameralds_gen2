import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { getMailLogo, getMailProductImage } from './mail-assets';


describe('mail assets', () => {
    const originalUploadsRoot = process.env.AM_UPLOADS_ROOT;
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'amstore-mail-assets-'));
        process.env.AM_UPLOADS_ROOT = directory;
        await mkdir(join(directory, 'public/images'), { recursive: true });
        await mkdir(join(directory, 'private'), { recursive: true });
    });

    afterEach(async () => {
        if (originalUploadsRoot === undefined) {
            delete process.env.AM_UPLOADS_ROOT;
        } else {
            process.env.AM_UPLOADS_ROOT = originalUploadsRoot;
        }
        await rm(directory, { recursive: true, force: true });
    });

    it('converts the provided Amstore SVG into an inline PNG', async () => {
        const logo = await getMailLogo();
        const metadata = await sharp(logo.content as Buffer).metadata();

        expect(logo.cid).toBe('amstore-logo@ameralds');
        expect(metadata).toMatchObject({ format: 'png', width: 188, height: 200 });
    });

    it('converts a WebP preview to a JPEG regardless of its filename extension', async () => {
        await sharp({ create: { width: 100, height: 80, channels: 3, background: '#346265' } })
            .webp().toFile(join(directory, 'public/images/preview.png'));

        const attachment = await getMailProductImage('uploads/public/images/preview.png', 'product@ameralds');
        const metadata = await sharp(attachment.content as Buffer).metadata();

        expect(metadata).toMatchObject({ format: 'jpeg', width: 432, height: 288 });
        expect(attachment).toMatchObject({ contentType: 'image/jpeg', contentDisposition: 'inline', cid: 'product@ameralds' });
    });

    it('uses a placeholder for missing images and never reads a private image', async () => {
        await sharp({ create: { width: 20, height: 20, channels: 3, background: '#346265' } })
            .png().toFile(join(directory, 'private/pattern.png'));

        await expect(getMailProductImage(undefined, 'missing@ameralds')).resolves.toBeUndefined();
        await expect(getMailProductImage('uploads/public/missing.png', 'missing@ameralds')).resolves.toBeUndefined();
        await expect(getMailProductImage('uploads/public/../private/pattern.png', 'private@ameralds')).resolves.toBeUndefined();
    });
});
