import type { LangNumberModel, PatternOrderForPriceModel, PatternPriceResultModel } from './models/pattern-price.model';

type PatternPriceLang = keyof PatternPriceResultModel;

const getLangNumberValue: (value: LangNumberModel, lang: PatternPriceLang) => number =
    (value: LangNumberModel, lang: PatternPriceLang) => Number(value?.[lang] ?? 0);

export function getPatternPrice(pattern: PatternOrderForPriceModel): PatternPriceResultModel {
    const sizesCount: number = pattern.sizes?.length ?? 0;
    const additionalSizesCount: number = Math.max(
        sizesCount - (pattern.requiresPatternPurchase ? 0 : 1),
        0,
    );
    const getPriceByLang: (lang: PatternPriceLang) => number = (lang: PatternPriceLang) =>
        Number(pattern.requiresPatternPurchase) * getLangNumberValue(pattern.pattern.basePrice, lang) +
        Number(pattern.color) * getLangNumberValue(pattern.pattern.colorPrice, lang) +
        additionalSizesCount * getLangNumberValue(pattern.pattern.additionalPrice, lang);

    return {
        en: getPriceByLang('en'),
        ru: getPriceByLang('ru'),
    };
}
