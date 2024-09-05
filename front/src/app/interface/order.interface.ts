import { IPattern, PattenSizeFiles } from "./pattern.interface"
import {ILangText} from "@am/interface/lang.interface";

export type OrdersRequest = {
    page: number;
    pageCount: number;
    orders: SmallOrders[];
}

export type SmallOrders = {
    id: number;
    status: number;
    create_date: string;
    jewels: any[];
    patterns: IPattern[];
}

export type IAdminCart = {
    purchases: IPatternPurchase[];
}

export type IPatternPurchase = {
    pattern: number;
    color: boolean;
    sizes: number[];
}

export interface IPurchaseSaved {
    id: number;
    pattern: IPattern;
    colors: boolean;
    sizes: PattenSizeFiles[];
}

export type IAdminOrder = {
    id: number;
    email: string;
    create_date: Date;
    purchases: IPurchaseSaved[];
};

export interface IAdminOrderShort {
    id: number;
    email: string;
    create_date: Date;
    purchases: {
        pattern: { id: number; name: ILangText };
        sizes: string[];
        color: boolean;
    }[];
}
