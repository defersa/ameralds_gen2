import { renderMailLayout } from './layout.template';
import { escapeHtml, formatRubles, MailTemplate } from './mail-template';


export interface CompletedOrderMailItem {
    name: string;
    categories: string[];
    sizes: number[];
    color: boolean;
    price: number;
    imageCid?: string;
}

export interface CompletedOrderMailData {
    id: number;
    email: string;
    vk?: string;
    completedAt?: Date;
    items: CompletedOrderMailItem[];
    total: number;
    orderUrl?: string;
}

function renderProduct(item: CompletedOrderMailItem): string {
    const image = item.imageCid
        ? `<img class="product-image" src="cid:${escapeHtml(item.imageCid)}" alt="${escapeHtml(item.name)}" width="216" height="144" style="display:block;width:216px;max-width:100%;height:auto;border-radius:7px 0 0 7px;">`
        : '<div style="padding:48px 16px;color:#6d876f;font-size:13px;line-height:20px;text-align:center;">Изображение недоступно</div>';
    const categories = item.categories.map((category) =>
        `<span style="display:inline-block;margin:0 4px 4px 0;padding:4px 7px;border-radius:3px;background-color:#38473a;color:#ffffff;font-size:11px;line-height:14px;">${escapeHtml(category)}</span>`,
    ).join('');
    const sizes = item.sizes.map((size) =>
        `<span style="display:inline-block;margin:0 4px 4px 0;padding:3px 9px;border:1px solid #6d876f;border-radius:4px;color:#38473a;font-size:12px;line-height:16px;">${escapeHtml(size)}</span>`,
    ).join('');

    return `<table class="product-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;border:1px solid #dce5d9;border-radius:8px;border-spacing:0;background-color:#ffffff;">
        <tr>
            <td class="product-image-cell" width="216" valign="top" style="width:216px;background-color:#edf5ee;border-radius:7px 0 0 7px;">${image}</td>
            <td class="product-details" valign="top" style="padding:14px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="padding:0 8px 8px 0;color:#111111;font-size:22px;line-height:26px;overflow-wrap:anywhere;">${escapeHtml(item.name)}</td>
                    <td align="right" valign="top" style="padding-top:4px;color:#38473a;font-size:14px;line-height:20px;font-weight:bold;white-space:nowrap;">${escapeHtml(formatRubles(item.price))}</td>
                </tr></table>
                ${categories ? `<div style="padding-bottom:4px;">${categories}</div>` : ''}
                <div style="padding-bottom:4px;color:#707070;font-size:12px;line-height:20px;">Размеры:&nbsp; ${sizes || 'не выбраны'}</div>
                <div style="color:#393939;font-size:13px;line-height:20px;">Подбор: ${item.color ? '<strong style="color:#38473a;font-weight:normal;">включён</strong>' : 'не выбран'}</div>
            </td>
        </tr>
    </table>`;
}

export function renderCompletedOrderMail(data: CompletedOrderMailData): MailTemplate {
    const subject = `Заказ №${data.id} оформлен`;
    const completedAt = data.completedAt
        ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(data.completedAt)
        : undefined;
    const products = data.items.map((item) =>
        `<tr><td style="padding-bottom:16px;">${renderProduct(item)}</td></tr>`,
    ).join('');
    const content = `
        <p style="margin:0 0 10px;color:#6d876f;font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Спасибо за заказ</p>
        <h1 class="order-heading" style="margin:0 0 12px;color:#38473a;font-size:30px;line-height:36px;font-weight:normal;">Заказ №${escapeHtml(data.id)} оформлен</h1>
        <p style="margin:0 0 24px;color:#707070;font-size:14px;line-height:22px;">Ваш заказ успешно оформлен. Ниже — выбранные схемы, размеры и подборы.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;margin-bottom:24px;border-bottom:1px solid #dce5d9;">
            ${completedAt ? `<tr><td style="padding:0 0 8px;color:#707070;font-size:13px;line-height:20px;">Дата заказа</td><td align="right" style="padding:0 0 8px;color:#393939;font-size:13px;line-height:20px;">${escapeHtml(completedAt)}</td></tr>` : ''}
            <tr><td style="padding:0 0 8px;color:#707070;font-size:13px;line-height:20px;">Email</td><td align="right" style="padding:0 0 8px;color:#393939;font-size:13px;line-height:20px;overflow-wrap:anywhere;">${escapeHtml(data.email)}</td></tr>
            ${data.vk ? `<tr><td style="padding:0 0 8px;color:#707070;font-size:13px;line-height:20px;">VK</td><td align="right" style="padding:0 0 8px;color:#393939;font-size:13px;line-height:20px;overflow-wrap:anywhere;">${escapeHtml(data.vk)}</td></tr>` : ''}
        </table>
        <h2 style="margin:0 0 16px;color:#393939;font-size:18px;line-height:24px;font-weight:normal;">В вашем заказе</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${products || '<tr><td style="padding-bottom:16px;color:#707070;font-size:14px;line-height:22px;">В заказе нет схем.</td></tr>'}</table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #cadccb;">
            <tr><td style="padding-top:20px;color:#38473a;font-size:18px;line-height:28px;">Итого</td><td align="right" style="padding-top:20px;color:#38473a;font-size:24px;line-height:28px;font-weight:bold;">${escapeHtml(formatRubles(data.total))}</td></tr>
        </table>
        ${data.orderUrl ? `<p style="margin:24px 0 12px;"><a href="${escapeHtml(data.orderUrl)}" style="display:inline-block;padding:12px 24px;background:#38473a;border-radius:6px;color:#ffffff;text-decoration:none;">Открыть заказ</a></p><p style="margin:0;color:#707070;font-size:13px;line-height:20px;">Ссылка автоматически выполнит вход в ваш аккаунт. Она действует 7 дней и может быть использована один раз.</p>` : ''}`;
    const text = [
        'AMSTORE',
        subject,
        'Ваш заказ успешно оформлен.',
        completedAt ? `Дата заказа: ${completedAt}` : null,
        `Email: ${data.email}`,
        data.vk ? `VK: ${data.vk}` : null,
        '',
        'В вашем заказе:',
        ...data.items.map((item) => [
            `${item.name} — ${formatRubles(item.price)}`,
            item.categories.length ? `Категории: ${item.categories.join(', ')}` : null,
            `Размеры: ${item.sizes.join(', ') || 'не выбраны'}`,
            `Подбор: ${item.color ? 'включён' : 'не выбран'}`,
            '',
        ].filter((line) => line !== null).join('\n')),
        data.items.length ? null : 'В заказе нет схем.',
        `Итого: ${formatRubles(data.total)}`,
        data.orderUrl ? `\nОткрыть заказ и войти в аккаунт: ${data.orderUrl}\nСсылка действует 7 дней и может быть использована один раз.` : null,
    ].filter((line) => line !== null).join('\n');

    return {
        subject,
        html: renderMailLayout(subject, `Ваш заказ №${data.id} оформлен. Схемы, размеры и подборы — в письме.`, content),
        text,
    };
}
