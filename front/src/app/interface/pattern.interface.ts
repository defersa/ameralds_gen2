import { CategoryType } from "./category.interface"
import { ImageModelSmall } from "./image.interface"
import { IdName, IPaginatedResponse } from "./request.interface"
import { ILangNumber, ILangText } from "@am/interface/lang.interface";
import { SizeType } from "@am/interface/size.interface";

export type IPattern = {
    id: number;
    name: ILangText;
    price: ILangNumber;

    hidden: boolean;
    description: string;
    create_date: any;

    images: ImageModelSmall[];
    category: CategoryType[]
    sizes: PattenSizeFiles[];
    colors: Blob | { id: number; };

}

export type PatternSaveResultResponse = {
    sizes: PatternSaveSizeResult[];
    id: number;
    result: boolean;
    images: [];
}

export type PatternSaveSizeResult = {
    id: number;
    size: {
        id: number;
    };
}

export type PattenSizeFiles = {
    id: number;
    size: SizeType;
    cbb: Blob | { id: number; };
    jbb: Blob | { id: number; };
    png: Blob | { id: number; };
    pdf: Blob | { id: number; };
}
