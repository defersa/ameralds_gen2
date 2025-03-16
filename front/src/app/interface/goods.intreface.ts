
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


export enum ProductType {
    Patterns = 'patterns',
    Jewels = 'jewels'
}

export type ProductLite = {
    id: number;
    price: ILangNumber;
}

