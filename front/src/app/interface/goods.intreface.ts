import { IPattern } from "./pattern.interface"
import { ILangNumber } from "@am/interface/lang.interface";
import type { PatternEntityDto } from "@am/root/api";

export type GoodsCard = {
    jewels: ProductLite[];
    patterns: PatternEntityDto[];
    id: number;
}
export type GoodsModifire = {
    goods: GoodsCard;
    result: boolean;
}
export enum PriceLocation {
    EN = 'price_en',
    RU = 'price_ru'
}

export enum ProductType {
    Patterns = 'patterns',
    Jewels = 'jewels'
}

export type ProductLite = {
    id: number;
    price: ILangNumber;
}

export type GoodsStatusResult = {
    result: boolean;
    patterns: {id: number}[];
    goods: GoodsCard;
}

