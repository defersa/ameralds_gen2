import { EmailLoginService } from "@am-back/db/service/email-login.service";
import { getMailLogo, getMailProductImage } from "@am-back/mail/mail-assets";
import { MailService } from "@am-back/mail/mail.service";
import { CompletedOrderMailItem, renderCompletedOrderMail } from "@am-back/mail/templates/completed-order.template";
import { ApiEntityNames, ApiErrorCodes, getPatternPrice } from "@ameralds/utils";
import { Injectable } from "@nestjs/common";
import { extname } from "node:path";
import type { Attachment } from "nodemailer/lib/mailer";
import { AdminOrderRepository } from "../repositories/admin-order.repository";
import { UserOrderRepository } from "../repositories/user-order.repository";
import { getAdminOrderFiles } from "./order-files";
import { BadRequestException } from "@nestjs/common";


@Injectable()
export class AdminOrderMailService {
	/** Подключает выборку заказов и получателей, создание ссылок входа и отправку писем. */
	constructor(
		private readonly orders: AdminOrderRepository,
		private readonly purchases: UserOrderRepository,
		private readonly emailLoginService: EmailLoginService,
		private readonly mailService: MailService,
	) {}

	/**
	 * Отправляет письмо завершённого заказа с уникальными CBB/PDF, изображениями и ссылкой в личный заказ
	 * при совпадении email. Без почтовой конфигурации или адресата ничего не отправляет.
	 */
	public async sendCompletedOrder(order: { id: number; email?: string }): Promise<void> {
		if (!this.mailService.configured) {
			return;
		}

		const recipient = order.email?.trim();

		if (!recipient) {
			return;
		}

		const completedOrder = await this.orders.findForMail(order.id);
		const files = getAdminOrderFiles(completedOrder);

		const attachments: Attachment[] = [
			await getMailLogo(),
			...files
				.map(
					(file): Attachment => ({
						filename: file.name,
						path: file.path,
						contentType:
							extname(file.name).toLowerCase() === ".pdf" ? "application/pdf" : "application/octet-stream",
						contentDisposition: "attachment",
					}),
				),
		];

		const items: CompletedOrderMailItem[] = await Promise.all(
			(completedOrder.patterns ?? [])
				.map(async (item, index) => {
					const pattern = item.pattern;

					const image = [...(pattern?.images ?? [])]
						.sort((a, b) => a.index - b.index || a.id - b.id)[0];

					const imageCid = `order-${order.id}-item-${index}@ameralds`;
					const attachment = await getMailProductImage(image?.preview || image?.full, imageCid);

					if (attachment) {
						attachments
							.push(attachment);
					}

					return {
						name: pattern?.name?.ru || pattern?.name?.en || "Схема недоступна",
						categories: (pattern?.categories ?? [])
							.map((category) => category.label?.ru || category.label?.en)
							.filter(Boolean),
						sizes: (item.sizes ?? [])
							.map((size) => size.size?.value)
							.filter((size) => size != null)
							.sort((a, b) => a - b),
						color: item.color,
						price: pattern ? getPatternPrice(item).ru : 0,
						imageCid: attachment ? imageCid : undefined,
					};
				}),
		);

		const personalOrder = await this.purchases.findPaidRecipient(order.id);

		const orderUrl =
			personalOrder?.user?.email?.toLowerCase() === recipient.toLowerCase()
				? await this.emailLoginService.createLink(personalOrder.user.id, `/account/orders/${personalOrder.id}`)
				: undefined;

		const template = renderCompletedOrderMail({
			id: order.id,
			email: recipient,
			vk: completedOrder.vk,
			completedAt: completedOrder.updatedAt ?? completedOrder.createdAt,
			items,
			total: items
				.reduce((sum, item) => sum + item.price, 0),
			orderUrl,
		});

		await this.mailService.send({
			to: recipient,
			...template,
			attachments,
		});
	}

	/**
	 * Проверяет активность, завершённость и email административного заказа перед повторной отправкой
	 * письма.
	 */
	public async resendOrderEmail(id: number): Promise<void> {
		const order = await this.orders.findActive(id);

		if (!order) {
			throw new BadRequestException({
				code: ApiErrorCodes.NOT_EXIST,
				entity: ApiEntityNames.CART,
			});
		}

		if (!order.isComplete) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.CART,
			});
		}

		if (!order.email?.trim()) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID_EMAIL,
				entity: ApiEntityNames.CART,
			});
		}

		await this.sendCompletedOrder({
			id: order.id,
			email: order.email,
		});
	}
}
