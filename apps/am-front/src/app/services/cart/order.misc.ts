import { NumberEntityDto } from '@am-front/root/api-v2';


export interface CartItemModel {
    pattern: number;
    sizes: number[];
    requiresPatternPurchase: boolean;
    color: boolean;
}

export const DEFAULT_CART_PRICE: NumberEntityDto =  { en: 0, ru: 0 };
