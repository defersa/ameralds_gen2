import { Injectable } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';
import { extname } from 'node:path';
import { process } from '@am-back/core/declare/process';
import { AdminOrderEntity } from '../../entities/purchases/order.entity';
import { DataSourceService } from '../../data-source.service';
import { ModelState } from '../../abstract/abstract.model';
import { getAdminOrderFiles } from './order.utils';
import { getPatternPrice } from '@ameralds/utils';
import { getMailLogo, getMailProductImage } from '../../../mail/mail-assets';
import { CompletedOrderMailItem, renderCompletedOrderMail } from '../../../mail/templates/completed-order.template';


@Injectable()
export class AdminOrderMailService {
    private transporter?: Transporter;

    constructor(private readonly dataSource: DataSourceService) {}

    public async sendCompletedOrder(order: AdminOrderEntity): Promise<void> {
        if (process.env.NODE_ENV !== 'dev') {
            return;
        }

        const recipient = order.email?.trim();

        if (!recipient) {
            return;
        }

        const completedOrder = await this.dataSource.getRepository(AdminOrderEntity).findOne({
            where: { id: order.id, state: ModelState.ACTIVE },
            relations: {
                patterns: {
                    sizes: { size: true, cbb: true, pdf: true },
                    pattern: {
                        name: true,
                        categories: { label: true },
                        images: true,
                        basePrice: true,
                        additionalPrice: true,
                        colorPrice: true,
                    },
                },
            },
            order: { patterns: { id: 'ASC' } },
        });

        const files = getAdminOrderFiles(completedOrder);
        const attachments: Attachment[] = [
            await getMailLogo(),
            ...files.map((file): Attachment => ({
                filename: file.name,
                path: file.path,
                contentType: extname(file.name).toLowerCase() === '.pdf' ? 'application/pdf' : 'application/octet-stream',
                contentDisposition: 'attachment',
            })),
        ];
        const items: CompletedOrderMailItem[] = await Promise.all((completedOrder.patterns ?? []).map(async (item, index) => {
            const pattern = item.pattern;
            const image = [...(pattern?.images ?? [])].sort((a, b) => a.index - b.index || a.id - b.id)[0];
            const imageCid = `order-${order.id}-item-${index}@ameralds`;
            const attachment = await getMailProductImage(image?.preview || image?.full, imageCid);

            if (attachment) {
                attachments.push(attachment);
            }

            return {
                name: pattern?.name?.ru || pattern?.name?.en || 'Схема недоступна',
                categories: (pattern?.categories ?? []).map((category) => category.label?.ru || category.label?.en).filter(Boolean),
                sizes: (item.sizes ?? []).map((size) => size.size?.value).filter((size) => size != null).sort((a, b) => a - b),
                color: item.color,
                price: pattern ? getPatternPrice(item).ru : 0,
                imageCid: attachment ? imageCid : undefined,
            };
        }));
        const template = renderCompletedOrderMail({
            id: order.id,
            email: recipient,
            vk: completedOrder.vk,
            completedAt: completedOrder.updatedAt ?? completedOrder.createdAt,
            items,
            total: items.reduce((sum, item) => sum + item.price, 0),
        });

        if (!this.transporter) {
            const { createTransport } = await import('nodemailer');

            this.transporter = createTransport({
                host: '127.0.0.1',
                port: 1025,
                secure: false,
            });
        }

        await this.transporter.sendMail({
            from: 'Ameralds <no-reply@ameralds.test>',
            to: recipient,
            ...template,
            attachments,
        });
    }
}
