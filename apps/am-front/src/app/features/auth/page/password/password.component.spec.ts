import { Location } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { ActivatedRoute, provideRouter, Router } from "@angular/router";
import { Subject } from "rxjs";
import { DialogService } from "@am-front/core/dialog/dialog.service";
import { AuthService } from "@am-front/services/auth.service";
import { PasswordComponent } from "./password.component";


describe("password setup and recovery page", () => {
	const token = "a".repeat(43);
	const auth = {
		requestPasswordReset: jest.fn(),
		validatePasswordReset: jest.fn(),
		resetPassword: jest.fn(),
	};
	const dialog = { openCustomDialog: jest.fn() };
	const replaceState = jest.fn();
	let validation: Subject<void>;
	let change: Subject<void>;
	let mail: Subject<void>;
	let fixture: ComponentFixture<PasswordComponent>;
	let route: { snapshot: { fragment: string | null } };
	let navigate: jest.SpyInstance;

	beforeEach(async () => {
		jest.clearAllMocks();
		validation = new Subject<void>();
		change = new Subject<void>();
		mail = new Subject<void>();
		auth.validatePasswordReset.mockReturnValue(validation);
		auth.resetPassword.mockReturnValue(change);
		auth.requestPasswordReset.mockReturnValue(mail);
		route = { snapshot: { fragment: "token=" + token } };

		await TestBed.configureTestingModule({
			imports: [PasswordComponent],
			providers: [
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: ActivatedRoute,
					useValue: route,
				},
				{
					provide: Location,
					useValue: { replaceState },
				},
				{
					provide: AuthService,
					useValue: auth,
				},
				{
					provide: DialogService,
					useValue: dialog,
				},
			],
		}).compileComponents();
		navigate = jest.spyOn(TestBed.inject(Router), "navigate").mockResolvedValue(true);
	});

	/** Показывает страницу; при действующей ссылке разрешает форму после ответа отдельной проверки. */
	function render(valid = true): void {
		fixture = TestBed.createComponent(PasswordComponent);

		if (valid && route.snapshot.fragment) {
			validation.next();
			validation.complete();
		}

		fixture.detectChanges();
	}

	/** Вводит данные через настоящий сигнальный контрол с нативным input-событием. */
	function fill(label: string, value: string): void {
		const input = fixture.nativeElement.querySelector(
			`amstore-input-signal[label="${label}"] input`,
		) as HTMLInputElement;

		input.value = value;
		input.dispatchEvent(new Event("input", { bubbles: true }));
		fixture.detectChanges();
	}

	/** Отправляет текущую форму нативным submit-событием. */
	function submit(): void {
		fixture.nativeElement.querySelector("form").dispatchEvent(
			new Event("submit", {
				bubbles: true,
				cancelable: true,
			}),
		);
		fixture.detectChanges();
	}

	it("removes the URL token and validates without changing password or requiring an account session", () => {
		render(false);

		expect(replaceState).toHaveBeenCalledWith("/auth/password");
		expect(auth.validatePasswordReset).toHaveBeenCalledWith(token);
		expect(auth.resetPassword).not.toHaveBeenCalled();
		expect(fixture.nativeElement.textContent).toContain("Проверяем ссылку");
		expect(fixture.nativeElement.querySelector("input")).toBeNull();
	});

	it("validates required, weak and mismatched passwords through the real controls before sending", () => {
		render();
		submit();
		expect(fixture.nativeElement.textContent).toContain("Это поле обязательно");
		fill("Новый пароль", "short");
		fill("Повторите пароль", "different");
		submit();
		expect(fixture.nativeElement.textContent).toContain("Слишком простой пароль");
		expect(fixture.nativeElement.textContent).toContain("Пароли не совпадают");
		expect(auth.resetPassword).not.toHaveBeenCalled();
	});

	it("saves only token and new credentials, blocks duplicate submits and shows success until explicit login", async () => {
		render();
		fill("Новый пароль", "NewPassword123!");
		fill("Повторите пароль", "NewPassword123!");
		submit();
		fixture.componentInstance.save();

		expect(auth.resetPassword).toHaveBeenCalledTimes(1);
		expect(auth.resetPassword).toHaveBeenCalledWith({
			token,
			password: "NewPassword123!",
			passwordRepeat: "NewPassword123!",
		});
		expect(fixture.nativeElement.querySelector("input").disabled).toBe(true);

		change.next();
		change.complete();
		fixture.detectChanges();

		expect(fixture.nativeElement.textContent).toContain("Пароль успешно изменён");
		expect(fixture.nativeElement.querySelector("input")).toBeNull();
		expect(navigate).not.toHaveBeenCalled();
		expect(dialog.openCustomDialog).not.toHaveBeenCalled();
		fixture.nativeElement.querySelector("button").click();
		await fixture.whenStable();
		expect(navigate).toHaveBeenCalledWith(["/"]);
		expect(dialog.openCustomDialog).toHaveBeenCalledTimes(1);
	});

	it("shows expired links immediately and requests a new email without repeating registration", () => {
		render(false);
		validation.error(
			new HttpErrorResponse({
				status: 401,
				error: { code: "EXPIRED" },
			}),
		);
		fixture.detectChanges();

		expect(fixture.nativeElement.textContent).toContain("Ссылка недействительна или срок её действия истёк");
		fixture.nativeElement.querySelector("button").click();
		fixture.detectChanges();
		fill("Email", "pending@example.com");
		submit();
		fixture.componentInstance.requestMail();
		expect(auth.requestPasswordReset).toHaveBeenCalledTimes(1);

		mail.next();
		mail.complete();
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain("Если для указанного адреса доступна установка пароля");
		expect(auth.resetPassword).not.toHaveBeenCalled();
	});

	it("uses the same expired-link screen when the token expires while filling the form", () => {
		render();
		fill("Новый пароль", "NewPassword123!");
		fill("Повторите пароль", "NewPassword123!");
		submit();
		change.error(new HttpErrorResponse({ status: 401 }));
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain("Ссылка недействительна");
		expect(navigate).not.toHaveBeenCalled();
	});

	it("allows retrying a failed reset and preserves typed values", () => {
		render();
		fill("Новый пароль", "NewPassword123!");
		fill("Повторите пароль", "NewPassword123!");
		submit();
		change.error(new HttpErrorResponse({ status: 503 }));
		fixture.detectChanges();

		expect(fixture.nativeElement.textContent).toContain("Не удалось изменить пароль");
		expect(fixture.nativeElement.querySelector("input").value).toBe("NewPassword123!");
		auth.resetPassword.mockReturnValue(new Subject<void>());
		submit();
		expect(auth.resetPassword).toHaveBeenCalledTimes(2);
	});

	it("opens the email form directly without a token and displays throttling errors with retry", () => {
		route.snapshot.fragment = null;
		render();
		expect(auth.validatePasswordReset).not.toHaveBeenCalled();
		submit();
		expect(auth.requestPasswordReset).not.toHaveBeenCalled();
		fill("Email", "buyer@example.com");
		submit();
		mail.error(new HttpErrorResponse({ status: 429 }));
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain("Слишком много попыток");
		expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
	});
});
