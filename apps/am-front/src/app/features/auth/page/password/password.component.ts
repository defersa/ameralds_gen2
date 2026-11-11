import { Location } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { disabled, email, form, FormField, maxLength, required, validate } from "@angular/forms/signals";
import { ActivatedRoute, Router } from "@angular/router";
import { isStrongPassword } from "@ameralds/utils";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { AmstoreInputSignalComponent } from "@am-front/cdk/signal-forms";
import { DialogService } from "@am-front/core/dialog/dialog.service";
import { AmstoreLoginComponent } from "@am-front/core/profile/login/login.component";
import { AuthService } from "@am-front/services/auth.service";
import { createRequestWrapper } from "@am-front/utils/request-wrapper";


interface NewPasswordForm {
	password: string;
	passwordRepeat: string;
}

@Component({
	selector: "amstore-password-page",
	templateUrl: "./password.component.html",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [AmstoreButtonComponent, AmstoreInputSignalComponent, FormField],
})
export class PasswordComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly dialog = inject(DialogService);
	private readonly location = inject(Location);
	private readonly route = inject(ActivatedRoute);
	private readonly linkToken = new URLSearchParams(this.route.snapshot.fragment ?? "").get("token");

	public readonly changing = signal(this.linkToken !== null);
	public readonly openingLogin = signal(false);
	public readonly passwordVisible = signal(false);
	public readonly repeatVisible = signal(false);
	public readonly emailModel = signal({ email: "" });
	public readonly model = signal<NewPasswordForm>({
		password: "",
		passwordRepeat: "",
	});

	public readonly mailRequest = createRequestWrapper<typeof this.auth.requestPasswordReset>(
		this.auth.requestPasswordReset.bind(this.auth),
	);
	public readonly resetRequest = createRequestWrapper<typeof this.auth.resetPassword>(
		this.auth.resetPassword.bind(this.auth),
	);
	public readonly validationRequest = createRequestWrapper<typeof this.auth.validatePasswordReset>(
		this.auth.validatePasswordReset.bind(this.auth),
	);

	public readonly emailForm = form(
		this.emailModel,
		(path) => {
			required(path.email);
			email(path.email);
			maxLength(path.email, 254);
			disabled(path, { when: () => this.mailRequest.loading() });
		},
		{ name: "password-email" },
	);

	public readonly passwordForm = form(
		this.model,
		(path) => {
			required(path.password);
			validate(path.password, ({ value }) =>
				!value() || isStrongPassword(value()) ? null : { kind: "notComplexity" },
			);
			required(path.passwordRepeat);
			validate(path.passwordRepeat, ({ value, valueOf }) =>
				!value() || value() === valueOf(path.password) ? null : { kind: "notEqualPassword" },
			);
			disabled(path, { when: () => this.resetRequest.loading() });
		},
		{ name: "new-password" },
	);

	public readonly invalidLink = computed(() => {
		const error = this.resetRequest.errors();
		const validationError = this.validationRequest.errors();

		return (
			this.changing() &&
			(!this.linkToken ||
				!/^[A-Za-z0-9_-]{43}$/.test(this.linkToken) ||
				(error instanceof HttpErrorResponse && error.status === 401) ||
				(validationError instanceof HttpErrorResponse && validationError.status === 401))
		);
	});

	/** Показывает безопасную ошибку запроса; 401 обрабатывается отдельным экраном недействительной ссылки. */
	public readonly error = computed(() => {
		const error = this.changing()
			? (this.resetRequest.errors() ?? this.validationRequest.errors())
			: this.mailRequest.errors();

		if (!error || this.invalidLink()) {
			return null;
		}

		if (error instanceof HttpErrorResponse && error.status === 429) {
			return "Слишком много попыток. Попробуйте позже";
		}

		return this.changing()
			? "Не удалось изменить пароль. Проверьте данные и попробуйте ещё раз."
			: "Не удалось принять запрос. Попробуйте ещё раз позже.";
	});

	/** Удаляет секрет из адресной строки; открытие страницы не использует токен и не меняет сессию. */
	constructor() {
		this.location.replaceState("/auth/password");

		if (this.changing()) {
			this.validateLink();
		}
	}

	/** Проверяет ссылку для показа формы без её погашения; после сетевой ошибки пользователь может повторить проверку. */
	public validateLink(): void {
		if (!this.linkToken || this.invalidLink() || this.validationRequest.loading()) {
			return;
		}

		this.validationRequest.request(this.linkToken).subscribe();
	}

	/** Отправляет email после проверки формы; состояние запроса блокирует повторную отправку и показывает ошибки. */
	public requestMail(event?: Event): void {
		event?.preventDefault();
		this.emailForm().markAsTouched();

		if (this.mailRequest.loading() || this.emailForm().invalid()) {
			return;
		}

		this.mailRequest.request(this.emailModel().email).subscribe();
	}

	/** Сохраняет новый пароль и повтор только с токеном ссылки; при ошибке форму можно исправить и отправить снова. */
	public save(event?: Event): void {
		event?.preventDefault();
		this.passwordForm().markAsTouched();

		if (
			this.resetRequest.loading() ||
			this.resetRequest.status() === "success" ||
			this.validationRequest.status() !== "success" ||
			this.passwordForm().invalid() ||
			this.invalidLink() ||
			!this.linkToken
		) {
			return;
		}

		this.resetRequest
			.request({
				token: this.linkToken,
				...this.model(),
			})
			.subscribe(() => {
				this.model.set({
					password: "",
					passwordRepeat: "",
				});
			});
	}

	/** Переключает видимость выбранного поля, сохраняя значение пароля. */
	public togglePassword(repeat: boolean): void {
		const visible = repeat ? this.repeatVisible : this.passwordVisible;

		visible.update((value) => !value);
	}

	/** Показывает форму запроса нового письма для истёкшей или использованной ссылки без регистрации. */
	public requestNewLink(): void {
		this.changing.set(false);
		this.resetRequest.clear();
		this.model.set({
			password: "",
			passwordRepeat: "",
		});
	}

	/** По нажатию пользователя открывает главную, затем обычный попап входа; не создаёт сессию автоматически. */
	public async openLogin(): Promise<void> {
		if (this.openingLogin()) {
			return;
		}

		this.openingLogin.set(true);

		try {
			const opened = await this.router.navigate(["/"]);

			if (opened) {
				this.dialog.openCustomDialog(AmstoreLoginComponent, {
					minWidth: "0",
					width: "440px",
					maxWidth: "calc(100vw - 32px)",
				});
			}
		} finally {
			this.openingLogin.set(false);
		}
	}
}
