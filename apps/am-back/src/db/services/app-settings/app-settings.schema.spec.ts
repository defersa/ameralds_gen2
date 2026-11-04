import {
	APP_SETTINGS_REGISTRY,
	DEFAULT_APP_SETTINGS,
	InvalidAppSettingsChangesError,
	InvalidStoredAppSettingsError,
	applyAppSettingsChanges,
	effectiveSetting,
	readSetting,
	readStoredSetting,
	validateStoredAppSettings,
} from "./app-settings.schema";


describe("AppSettings schema evolution", () => {
	const days = APP_SETTINGS_REGISTRY["orders.paymentExpirationDays"];

	it("reads absent fields without rewriting an old snapshot", () => {
		const snapshot = {
			legacy: { enabled: false },
		};

		validateStoredAppSettings(snapshot);
		expect(readSetting(undefined, days)).toBeUndefined();
		expect(effectiveSetting(undefined, days)).toBe(7);
		expect(snapshot).toEqual({
			legacy: { enabled: false },
		});
		expect(DEFAULT_APP_SETTINGS.orders.paymentExpirationDays).toBe(7);
		expect(readStoredSetting(snapshot, "orders.paymentExpirationDays")).toBeUndefined();
		expect(
			readStoredSetting(
				{
					orders: { paymentExpirationDays: 14 },
				},
				"orders.paymentExpirationDays",
			),
		).toBe(14);
	});

	it("preserves valid false, 0 and explicitly allowed null instead of substituting defaults", () => {
		expect(
			effectiveSetting(false, {
				defaultValue: true,
				validate: (v): v is boolean => typeof v === "boolean",
			}),
		).toBe(false);
		expect(
			effectiveSetting(0, {
				defaultValue: 7,
				validate: (v): v is number => typeof v === "number",
			}),
		).toBe(0);
		expect(
			effectiveSetting(null, {
				defaultValue: "fallback",
				validate: (v): v is string | null => v === null || typeof v === "string",
			}),
		).toBeNull();
	});

	it.each([
		null,
		[],
		"7",
		{ orders: null },
		{
			orders: [],
		},
		{
			orders: { paymentExpirationDays: null },
		},
		{
			orders: { paymentExpirationDays: "7" },
		},
		{
			orders: { paymentExpirationDays: 0 },
		},
		{
			orders: { paymentExpirationDays: false },
		},
	])("rejects corrupt data: %j", (value) => {
		expect(() => validateStoredAppSettings(value)).toThrow(InvalidStoredAppSettingsError);
	});

	it("copies the previous JSON, including unknown and deprecated fields", () => {
		const old = {
			orders: {
				retired: { x: 1 },
				future: false,
			},
			future: [0, false, null],
		};

		const result = applyAppSettingsChanges(old, {
			orders: { paymentExpirationDays: 14 },
		});

		expect(result).toEqual({
			...old,
			orders: {
				...old.orders,
				paymentExpirationDays: 14,
			},
		});
		result.orders.retired = "changed";
		expect(old.orders.retired).toEqual({ x: 1 });
		expect(old.orders).not.toHaveProperty("paymentExpirationDays");
	});

	it.each([
		{},
		null,
		[],
		{ secret: "value" },
		{
			orders: {},
		},
		{
			orders: { token: "secret" },
		},
		{
			orders: {
				paymentExpirationDays: 7,
				token: "secret",
			},
		},
		{
			orders: { paymentExpirationDays: undefined },
		},
		...[0, -1, 366, 1.5, NaN, Infinity, "7", false, null]
			.map((value) => ({
				orders: { paymentExpirationDays: value },
			})),
	])("rejects unknown keys, secrets and invalid changes: %j", (changes) => {
		expect(() => applyAppSettingsChanges({}, changes)).toThrow(InvalidAppSettingsChangesError);
	});

	it.each([1, 7, 365])("accepts a valid payment expiration: %s", (paymentExpirationDays) => {
		expect(
			applyAppSettingsChanges(
				{},
				{
					orders: { paymentExpirationDays },
				},
			),
		).toEqual({
			orders: { paymentExpirationDays },
		});
	});
});
