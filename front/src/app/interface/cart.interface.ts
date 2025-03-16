import { ILangNumber } from "@am/interface/lang.interface";


export interface CartPattern {
    id: number;
    sizes: number[];
    colors: boolean;
    price: ILangNumber;
}
