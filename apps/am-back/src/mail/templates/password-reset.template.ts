import { renderMailLayout } from "./layout.template";
import { escapeHtml, MailTemplate } from "./mail-template";


/** Формирует письмо установки первого или нового пароля; ссылка не выполняет вход и действует 24 часа. */
export function renderPasswordResetMail(url: string): MailTemplate {
	const subject = "Установка пароля в AMSTORE";

	return {
		subject,
		html: renderMailLayout(
			subject,
			"Установите новый пароль",
			`
            <h1 style="margin:0 0 16px;font-size:28px;line-height:36px;">Установите новый пароль</h1>
            <p style="margin:0 0 24px;line-height:22px;">Перейдите по ссылке и укажите новый пароль. Старый пароль не потребуется. После сохранения все сеансы вашего аккаунта будут завершены.</p>
            <p style="margin:0 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#38473a;border-radius:6px;color:#fff;text-decoration:none;">Установить пароль</a></p>
            <p style="margin:0;line-height:22px;">Ссылка действует 24 часа и может быть использована один раз. Если вы не запрашивали смену пароля, проигнорируйте письмо. Ваш пароль останется прежним.</p>
        `,
			"Письмо отправлено по запросу установки пароля.",
		),
		text: `Установка пароля в AMSTORE\n\nУстановить новый пароль: ${url}\n\nСтарый пароль не потребуется. После сохранения все сеансы аккаунта будут завершены. Ссылка действует 24 часа и используется один раз. Если вы не запрашивали смену пароля, проигнорируйте письмо. Ваш пароль останется прежним.`,
	};
}

/** Формирует уведомление о завершённой смене пароля без пароля, токенов и автоматического входа. */
export function renderPasswordChangedMail(): MailTemplate {
	const subject = "Пароль AMSTORE изменён";

	return {
		subject,
		html: renderMailLayout(
			subject,
			"Пароль успешно изменён",
			`
            <h1 style="margin:0 0 16px;font-size:28px;line-height:36px;">Пароль успешно изменён</h1>
            <p style="margin:0;line-height:22px;">Пароль вашего аккаунта AMSTORE изменён. Все прежние сеансы завершены. Если это сделали не вы, восстановите доступ к своей почте и запросите новую установку пароля на сайте.</p>
        `,
			"Уведомление об изменении пароля.",
		),
		text: "Пароль вашего аккаунта AMSTORE успешно изменён. Все прежние сеансы завершены. Если это сделали не вы, восстановите доступ к своей почте и запросите новую установку пароля на сайте.",
	};
}
