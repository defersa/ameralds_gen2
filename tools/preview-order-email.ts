import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import MailComposer from 'nodemailer/lib/mail-composer';
import { getMailLogo, getMailProductImage } from '../apps/am-back/src/mail/mail-assets';
import { renderCompletedOrderMail } from '../apps/am-back/src/mail/templates/completed-order.template';


async function main(): Promise<void> {
    const directory = join(tmpdir(), 'amstore-order-email');
    const logo = await getMailLogo();
    const image = await getMailProductImage(process.argv[2], 'preview-product@ameralds');
    const attachments = image ? [logo, image] : [logo];
    const template = renderCompletedOrderMail({
        id: 42,
        email: 'buyer@example.com',
        vk: 'https://vk.ru/buyer',
        completedAt: new Date(2026, 9, 16),
        items: [{
            name: 'Пример схемы',
            categories: ['Радуга', 'Змеи', 'Животные', 'Серый'],
            sizes: [31, 33],
            color: true,
            price: 700,
            imageCid: image?.cid,
        }],
        total: 700,
    });
    const html = template.html.replace(/cid:([^"\s]+)/g, (source, cid: string) => {
        const attachment = attachments.find((item) => item.cid === cid);

        return attachment
            ? `data:${attachment.contentType};base64,${(attachment.content as Buffer).toString('base64')}`
            : source;
    });
    const message = await new MailComposer({
        from: 'Ameralds <no-reply@ameralds.test>',
        to: 'buyer@example.com',
        ...template,
        attachments,
    }).compile().build();

    await mkdir(directory, { recursive: true });
    await Promise.all([
        writeFile(join(directory, 'preview.html'), html),
        writeFile(join(directory, 'preview.txt'), template.text),
        writeFile(join(directory, 'preview.eml'), message),
    ]);

    console.log(`HTML preview: ${join(directory, 'preview.html')}`);
    console.log(`Email file: ${join(directory, 'preview.eml')}`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
