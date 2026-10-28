import { renderMailLayout } from './layout.template';
import { escapeHtml, MailTemplate } from './mail-template';

export function renderRegistrationMail(url: string): MailTemplate {
    const subject = 'Подтвердите регистрацию в AMSTORE';
    return {
        subject,
        html: renderMailLayout(subject, 'Подтверждение регистрации в AMSTORE', `
            <h1 style="margin:0 0 16px;color:#38473a;font-size:28px;line-height:36px;font-weight:normal;">Подтвердите регистрацию</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:22px;">Если вы заполнили форму регистрации, нажмите кнопку. Мы создадим аккаунт с паролем, указанным в форме, и выполним вход.</p>
            <p style="margin:0 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#38473a;border-radius:6px;color:#ffffff;text-decoration:none;">Подтвердить регистрацию</a></p>
            <p style="margin:0;font-size:13px;line-height:20px;color:#707070;">Ссылка действует 7 дней и может быть использована один раз. Если вы не запрашивали регистрацию, не переходите по ссылке и проигнорируйте письмо.</p>
        `, 'Письмо отправлено по запросу регистрации.'),
        text: `Подтверждение регистрации в AMSTORE\n\nЕсли вы заполнили форму регистрации, перейдите по ссылке: ${url}\n\nМы создадим аккаунт с паролем, указанным в форме, и выполним вход. Ссылка действует 7 дней и может быть использована один раз. Если вы не запрашивали регистрацию, не переходите по ссылке и проигнорируйте письмо.`,
    };
}
