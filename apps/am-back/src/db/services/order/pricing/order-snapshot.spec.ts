import { InvalidOrderPriceError, toMinorAmount } from "./order-price";
import { createOrderPatternSnapshot, sumOrderSnapshots } from "./order-snapshot";


describe("order money snapshots", () => {
	it.each([
		["0.29", 29],
		["12.30", 1230],
		["12.0000", 1200],
		["90071992547409.91", Number.MAX_SAFE_INTEGER],
		[0, 0],
	])("converts %s exactly to %s minor units", (value, expected) => expect(toMinorAmount(value)).toBe(expected));
	it.each(["0.001", "-1", "NaN", "Infinity", "90071992547409.92", "1e3"])(
		"rejects invalid or unsafe catalogue price %s",
		(value) => {
			expect(() => toMinorAmount(value)).toThrow(InvalidOrderPriceError);
		},
	);
	it("copies a plain selection and keeps its history independent of later catalogue changes", () => {
		const item = {
			color: true,
			requiresPatternPurchase: true,
			pattern: {
				id: 7,
				name: {
					ru: "Схема",
					en: "Pattern",
				},
				basePrice: {
					ru: 0.1,
					en: 1.01,
				},
				additionalPrice: {
					ru: 0.2,
					en: 0.01,
				},
				colorPrice: {
					ru: 0.29,
					en: 0.02,
				},
			},
			sizes: [
				{
					id: 3,
					size: {
						id: 9,
						value: 36,
					},
				},
			],
		};

		const snapshot = createOrderPatternSnapshot(item, "RUB");

		expect(snapshot).toMatchObject({
			subtotalAmount: 59,
			totalAmount: 59,
			discountAmount: 0,
			discounts: [],
			name: { ru: "Схема" },
			sizes: [{ value: 36 }],
		});
		expect(snapshot.components
			.map((component) => component.totalAmount)).toEqual([10, 20, 29]);
		expect(createOrderPatternSnapshot(item, "USD").totalAmount).toBe(104);
		item.pattern.name.ru = "Изменено";
		item.pattern.basePrice.ru = 100;
		item.sizes[0].size.value = 99;
		expect(snapshot.name.ru).toBe("Схема");
		expect(snapshot.sizes[0].value).toBe(36);
		expect(sumOrderSnapshots([snapshot, snapshot], "RUB")).toMatchObject({
			subtotalAmount: 118,
			totalAmount: 118,
			discountAmount: 0,
			discounts: [],
		});
		expect(() => sumOrderSnapshots([snapshot], "USD")).toThrow(InvalidOrderPriceError);
	});
});
