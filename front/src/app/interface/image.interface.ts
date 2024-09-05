import { IdName } from "./request.interface"

export type ImageModelSmall = {
    id: number;
    image_full: string;
    image_small: string;
    select?: boolean;
}

export type ImageModel = {
    id: number;
    image_full: string;
    image_small: string;
    select?: boolean;
    jewelry: IdName[];
    pattern: IdName[];
}
export type ImageModelRequest = {
    page: number,
    pageCount: number,
    images: ImageModel[];
}

export type ImageAddRequest = {
    image: ImageModel;
}

export type ImageType = {
    id: number;
    image_full: string;
    image_small: string;
}


export type IIndexedImage = { image: ImageType; index: number; };
export type IIndexedBlob = { image: File; src: string; index: number; };
