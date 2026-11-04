import { normalizeUserSelection } from "./normalize-user-selection";


describe("normalizeUserSelection", () => {
	it.each([
		{ owned: [], sizes: [], color: true, expected: null },
		{ owned: [], sizes: [1, 1], color: true, expected: { sizes: [1], color: true, requiresPatternPurchase: true } },
		{ owned: [{ patternId: 7, sizeIds: [1], color: false }], sizes: [], color: true, expected: { sizes: [], color: true, requiresPatternPurchase: false } },
		{ owned: [{ patternId: 7, sizeIds: [1], color: true }], sizes: [1], color: true, expected: null },
		{ owned: [{ patternId: 7, sizeIds: [1], color: true }], sizes: [1, 2], color: true, expected: { sizes: [2], color: false, requiresPatternPurchase: false } },
		{ owned: [{ patternId: 7, sizeIds: [], color: true }], sizes: [], color: true, expected: null },
		{ owned: [{ patternId: 8, sizeIds: [1], color: true }], sizes: [1], color: true, expected: { sizes: [1], color: true, requiresPatternPurchase: true } },
		{ owned: [{ patternId: 7, sizeIds: [1], color: false }, { patternId: 7, sizeIds: [2], color: true }], sizes: [1, 2, 3], color: true, expected: { sizes: [3], color: false, requiresPatternPurchase: false } },
	])("normalizes $sizes / color=$color with $owned", ({ owned, sizes, color, expected }) => {
		const result = normalizeUserSelection({ pattern: 7, sizes, color, requiresPatternPurchase: false }, owned);

		expect(result).toEqual(expected ? { pattern: 7, ...expected } : null);
	});
});
