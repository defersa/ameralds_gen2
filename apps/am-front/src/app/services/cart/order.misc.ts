import { NumberEntityDto } from '@am-front/root/api-v2';


export interface CartItemModel {
    pattern: number;
    sizes: number[];
    requiresPatternPurchase: boolean;
    color: boolean;
}

export const DEFAULT_CART_PRICE: NumberEntityDto =  { en: 0, ru: 0 };

type OrderPatternEntityLike = {
    color: boolean;
    requiresPatternPurchase: boolean;
    sizes: { size: { id: number } }[];
    pattern: { id: number };
}

export function convertOrderPatternEntityToCartItem(product: OrderPatternEntityLike): CartItemModel {
    return {
        ...product,
        pattern: product.pattern.id,
        sizes: product.sizes.map((size: { size: { id: number } }) => size.size.id),
    }
}
