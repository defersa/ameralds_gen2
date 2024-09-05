import { ILangNumber } from "@am/interface/lang.interface";

export interface UserCart {
    id: string;
    patterns: CartPattern[];
    jewelry: CartJewelry[];
}

export interface CartPattern {
    id: number;
    sizes: number[];
    colors: boolean;
    price: ILangNumber;
}

export interface CartJewelry {
    id: number;
    price: ILangNumber;
}
