import { compare } from "bcrypt";
import { createHash } from "node:crypto";
import { PasswordResetRepository } from "../repositories/password-reset.repository";
import { PasswordResetService, PASSWORD_RESET_TTL_MS } from "./password-reset.service";


describe("password reset tokens", () => {
	const token = "a".repeat(43);
	const previousSite = process.env.SITE_URL;
	const repository = {
		issue: jest.fn(),
		consume: jest.fn(),
		isUsable: jest.fn(),
		deleteExpired: jest.fn(),
	};
	let service: PasswordResetService;

	beforeEach(() => {
		jest.resetAllMocks();
		process.env.SITE_URL = "https://shop.example";
		repository.issue.mockResolvedValue(true);
		repository.consume.mockResolvedValue(undefined);
		repository.isUsable.mockResolvedValue(true);
		service = new PasswordResetService(repository as unknown as PasswordResetRepository);
	});

	afterEach(() => {
		jest.useRealTimers();

		if (previousSite === undefined) {
			delete process.env.SITE_URL;
		} else {
			process.env.SITE_URL = previousSite;
		}
	});

	it("issues a separate opaque token for 24 hours, storing only its hash", async () => {
		jest.useFakeTimers().setSystemTime(new Date("2026-11-11T12:00:00Z"));

		const url = new URL(await service.createLink("buyer@example.com"));
		const rawToken = new URLSearchParams(url.hash.slice(1)).get("token");

		expect(url.origin + url.pathname).toBe("https://shop.example/auth/password");
		expect(url.search).toBe("");
		expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(repository.issue).toHaveBeenCalledWith(
			"buyer@example.com",
			createHash("sha256").update(rawToken).digest("hex"),
			new Date(Date.now() + PASSWORD_RESET_TTL_MS),
		);
		expect(JSON.stringify(repository.issue.mock.calls)).not.toContain(rawToken);
	});

	it("does not send a usable link for unknown or inactive accounts", async () => {
		repository.issue.mockResolvedValue(false);

		await expect(service.createLink("unknown@example.com")).resolves.toBeNull();
		expect(repository.consume).not.toHaveBeenCalled();
	});

	it("validates a link without consuming it", async () => {
		await expect(service.validate(token)).resolves.toBeUndefined();
		expect(repository.isUsable).toHaveBeenCalledWith(createHash("sha256").update(token).digest("hex"));
		expect(repository.consume).not.toHaveBeenCalled();

		repository.isUsable.mockResolvedValue(false);

		await expect(service.validate(token)).rejects.toMatchObject({
			status: 401,
			response: { code: "EXPIRED" },
		});
	});

	it("hashes a valid password and changes it only for the supplied token", async () => {
		await service.change(token, "NewPassword123!", "NewPassword123!");

		const [tokenHash, passwordHash] = repository.consume.mock.calls[0];

		expect(tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
		expect(await compare("NewPassword123!", passwordHash)).toBe(true);
		expect(passwordHash).not.toBe("NewPassword123!");
	});

	it.each([undefined, null, "", "bad", 42])(
		"rejects malformed token %s without database reads or writes",
		async (value) => {
			await expect(service.change(value as string, "NewPassword123!", "NewPassword123!")).rejects.toMatchObject({
				status: 401,
			});
			await expect(service.validate(value as string)).rejects.toMatchObject({ status: 401 });
			expect(repository.consume).not.toHaveBeenCalled();
			expect(repository.isUsable).not.toHaveBeenCalled();
		},
	);

	it.each([
		["short", "short"],
		["NewPassword123!", "Different123!"],
		["Aa1" + "x".repeat(70), "Aa1" + "x".repeat(70)],
		[undefined, undefined],
	])("rejects invalid or mismatched passwords before changing the account", async (password, repeat) => {
		await expect(service.change(token, password, repeat)).rejects.toMatchObject({
			status: 400,
			response: { code: "INVALID_PASSWORD" },
		});
		expect(repository.consume).not.toHaveBeenCalled();
	});
});
