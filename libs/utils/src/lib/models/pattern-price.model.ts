export type PatternPriceValueModel = number | string | null | undefined;

export interface LangNumberModel {
    ru: PatternPriceValueModel;
    en?: PatternPriceValueModel;
}

export interface PatternForPriceModel {
    basePrice: LangNumberModel;
    additionalPrice: LangNumberModel;
    colorPrice: LangNumberModel;
}

export interface PatternOrderForPriceModel {
    pattern: PatternForPriceModel;
    requiresPatternPurchase: boolean;
    color: boolean;
    sizes: unknown[];
}

export interface PatternPriceResultModel {
    ru: number;
    en: number;
}
