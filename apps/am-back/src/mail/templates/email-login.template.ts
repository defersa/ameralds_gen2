import { renderMailLayout } from './layout.template';
import { escapeHtml, MailTemplate } from './mail-template';

export function renderEmailLoginMail(url: string): MailTemplate {
    const subject = 'Вход в AMSTORE';
    return {
        subject,
        html: renderMailLayout(subject, 'Ссылка для входа в ваш аккаунт AMSTORE', `
            <h1 style="margin:0 0 16px;color:#38473a;font-size:28px;line-height:36px;font-weight:normal;">Войти в аккаунт</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:22px;">Нажмите кнопку, чтобы войти в AMSTORE без пароля.</p>
            <p style="margin:0 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#38473a;border-radius:6px;color:#ffffff;text-decoration:none;">Войти</a></p>
            <p style="margin:0;font-size:13px;line-height:20px;color:#707070;">Ссылка действует 7 дней и может быть использована один раз. Если вы не запрашивали вход, просто проигнорируйте письмо.</p>
        `, 'Письмо отправлено по запросу входа в аккаунт.'),
        text: `Вход в AMSTORE\n\nВойти без пароля: ${url}\n\nСсылка действует 7 дней и может быть использована один раз. Если вы не запрашивали вход, просто проигнорируйте письмо.`,
    };
}
