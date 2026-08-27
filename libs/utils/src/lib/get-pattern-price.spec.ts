import { getPatternPrice } from './get-pattern-price';

describe('getPatternPrice', () => {
    it('should include base, color and additional price for every selected size when pattern purchase is required', () => {
        expect(getPatternPrice({
            requiresPatternPurchase: true,
            color: true,
            sizes: [1, 2],
            pattern: {
                basePrice: { en: 10, ru: 100 },
                additionalPrice: { en: 2, ru: 20 },
                colorPrice: { en: 3, ru: 30 },
            },
        })).toEqual({ en: 17, ru: 170 });
    });

    it('should charge only extra sizes when pattern purchase is not required', () => {
        expect(getPatternPrice({
            requiresPatternPurchase: false,
            color: false,
            sizes: [1, 2],
            pattern: {
                basePrice: { en: 10, ru: 100 },
                additionalPrice: { en: 2, ru: 20 },
                colorPrice: { en: 3, ru: 30 },
            },
        })).toEqual({ en: 2, ru: 20 });
    });

    it('should not return negative additional price for an empty size list', () => {
        expect(getPatternPrice({
            requiresPatternPurchase: false,
            color: false,
            sizes: [],
            pattern: {
                basePrice: { en: 10, ru: 100 },
                additionalPrice: { en: 2, ru: 20 },
                colorPrice: { en: 3, ru: 30 },
            },
        })).toEqual({ en: 0, ru: 0 });
    });
});
