import { InputShortOrderPatternDto } from '../../../modules/orders/dto/orders.dto';
import { getPatternPrice, PatternOrderForPriceModel } from '@ameralds/utils';
import { NumberEntityDto } from '../../../common/common.dto';


export function getOrderPrice(patters: PatternOrderForPriceModel[]): NumberEntityDto {
    return patters
        .map((pattern: PatternOrderForPriceModel) => getPatternPrice(pattern))
        .reduce((a: NumberEntityDto, b: NumberEntityDto) => ({
            en: a.en + b.en,
            ru: a.ru + b.ru,
        }), { en: 0, ru: 0 });
}

export function prepareCartPattern(
    item: InputShortOrderPatternDto,
): InputShortOrderPatternDto {
    return item.pattern && item.sizes?.length > 0 ? {
        pattern: item.pattern,
        requiresPatternPurchase: true,
        color: item.color,
        sizes: item.sizes,
    } : null;
}
