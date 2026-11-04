import { AppSettingEntity } from "@am-back/db/entities/app-setting.entity";
import { UserEntity } from "@am-back/db/entities/user.entity";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { AppSettingsService } from "./app-settings.service";
import { AppSettingsRepository } from "./repositories/app-settings.repository";


describe("AppSettings use cases", () => {
	const rows = {
		findCurrent: jest.fn(),
		findVersion: jest.fn(),
		findHistoryPage: jest.fn(),
		insertVersion: jest.fn(),
		lockVersions: jest.fn(),
	};

	const manager = new DataSource({ type: "postgres" }).createEntityManager();

	const transaction = jest.fn(async (_level: string, work: (value: typeof manager) => Promise<unknown>) =>
		work(manager),
	);

	let settings: AppSettingsService;

	/** Создаёт тестовую версию настроек с пустым snapshot, фиксированной датой и без автора. */
	const row = (version = 5): AppSettingEntity =>
		Object.assign(new AppSettingEntity(), {
			version,
			snapshot: {},
			createdAt: new Date("2026-11-01"),
			createdById: null,
		});

	beforeEach(async () => {
		jest.resetAllMocks();
		transaction.mockImplementation(async (_level, work) => work(manager));
		rows.findCurrent.mockResolvedValue(row());

		const module = await Test.createTestingModule({
			providers: [
				AppSettingsService,
				{
					provide: AppSettingsRepository,
					useValue: rows,
				},
				{
					provide: DataSource,
					useValue: { transaction },
				},
			],
		}).compile();

		settings = module.get(AppSettingsService);
	});

	it("does not cache another instance’s changes and applies defaults only to absent values", async () => {
		rows.findCurrent.mockResolvedValueOnce(row()).mockResolvedValueOnce({
			...row(6),
			snapshot: {
				orders: { paymentExpirationDays: 14 },
			},
		});
		await expect(settings.getRaw("orders.paymentExpirationDays")).resolves.toBeUndefined();
		await expect(settings.get("orders.paymentExpirationDays")).resolves.toBe(14);
		expect(rows.findCurrent).toHaveBeenCalledTimes(2);
	});

	it("does not mask database failures or attempt initialization after a failed read", async () => {
		const error = new Error("DB unavailable");

		rows.findCurrent.mockRejectedValue(error);
		await expect(settings.onModuleInit()).rejects.toBe(error);
		expect(transaction).not.toHaveBeenCalled();
	});

	it("does not substitute defaults for corrupt known fields", async () => {
		rows.findCurrent.mockResolvedValue({
			...row(),
			snapshot: {
				orders: { paymentExpirationDays: "7" },
			},
		});
		await expect(settings.get("orders.paymentExpirationDays")).rejects.toThrow("Invalid stored setting");
	});

	it("returns public metadata without exposing an author entity or its credentials", async () => {
		rows.findCurrent.mockResolvedValue({
			...row(),
			createdBy: Object.assign(new UserEntity(), {
				id: 1,
				username: "Admin",
				email: "admin@test",
				passwordHash: "secret",
				access: ["private"],
			}),
		});

		const result = await settings.current();

		expect(result.createdBy).toEqual({
			id: 1,
			username: "Admin",
			email: "admin@test",
		});
		expect(JSON.stringify(result)).not.toContain("secret");
		expect(result).not.toHaveProperty("createdById");
	});

	it("rejects a stale editor without inserting or silently retrying a version", async () => {
		await expect(
			settings.createVersion(
				4,
				{
					orders: { paymentExpirationDays: 14 },
				},
				1,
			),
		).rejects.toMatchObject({
			status: 409,
			response: { code: "VERSION_CONFLICT" },
		});
		expect(rows.lockVersions).toHaveBeenCalledWith(manager);
		expect(rows.insertVersion).not.toHaveBeenCalled();
	});

	it("preserves unknown fields when creating the next version", async () => {
		rows.findCurrent.mockResolvedValue({
			...row(),
			snapshot: {
				future: { enabled: false },
			},
		});
		rows.insertVersion.mockImplementation(async (version, snapshot) => ({
			...row(version),
			snapshot,
		}));

		const result = await settings.createVersion(
			5,
			{
				orders: { paymentExpirationDays: 14 },
			},
			1,
		);

		expect(result).toMatchObject({
			version: 6,
			snapshot: {
				future: { enabled: false },
				orders: { paymentExpirationDays: 14 },
			},
		});
		expect(rows.insertVersion).toHaveBeenCalledWith(6, result.snapshot, 1, manager);
	});

	it("returns a structured error for missing versions and invalid pagination", async () => {
		rows.findVersion.mockResolvedValue(null);
		await expect(settings.version(10)).rejects.toMatchObject({
			status: 400,
			response: { code: "NOT_EXIST" },
		});
		await expect(settings.history(0)).rejects.toMatchObject({ status: 400 });
		expect(rows.findHistoryPage).not.toHaveBeenCalled();
	});

	it("keeps page rows, total and active marker in the same transaction", async () => {
		rows.findHistoryPage.mockResolvedValue([[row(4)], 12]);

		const result = await settings.history(2);

		expect(transaction).toHaveBeenCalledWith("REPEATABLE READ", expect.any(Function));
		expect(rows.findHistoryPage).toHaveBeenCalledWith(2, 10, manager);
		expect(result).toMatchObject({
			page: 2,
			total: 12,
			count: 2,
			activeVersion: 5,
			items: [{ version: 4 }],
		});
	});
});
