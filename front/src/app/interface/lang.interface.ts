
export type LangType = 'en' | 'ru';

export type LangObject = {
    type: LangType;
    label: string;
    url: string;
}

export type ILangText = {
    en: string;
    ru: string;
};

export type ILangNumber = {
    en: number;
    ru: number;
};
