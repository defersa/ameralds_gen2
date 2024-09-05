import { environment } from "src/environments/environment";


export enum HttpActions {
    Profile = 'profile',
    Patterns = 'patterns',
    Pattern = 'pattern',
    PatternEdit = 'pattern-edit',
    AddProduct = 'add-product',
    RemoveProduct = 'remove-product',

    UploadImage = 'upload-image-file',

    GoodsBuy = 'goods-buy',

    GetOrders = 'get-orders',
    GetOwnPatterns = 'get-own-patterns',

    Category = 'category',
    Categories = 'categories',
    AllCategories = 'categories-all',

    Size = 'size',
    Sizes = 'sizes',
    AllSizes = 'sizes-all',

    PatternSizeFile = 'pattern-size-file',
    PatternColorsFile = 'pattern-colors-file',
    PatternDownloadSizeFile = 'pattern-download-size-file',
    PatternDownloadColorsFile = 'pattern-download-colors-file',

    SendMail = 'send-mail',
}

export enum HttpAuthActions {
    TokenAuth = 'login',
    RefreshToken = 'refresh',
    Registration = 'registration',
    SendVerifyToken = 'send-verify-token',
    Verify = 'verify'
}


export enum HttpProfileActions {
    Own = 'own'
}


export enum RestSuffixFragments {
    Default = '/',
    Auth = '/auth/',
    Profile = '/profile/'
}

type ActionsUnit = HttpActions | HttpAuthActions | HttpProfileActions;

const REST_PREFIX: string = '/api';

export function getAction(action: ActionsUnit, suffix: RestSuffixFragments = RestSuffixFragments.Default): string {
    return environment.endpoint + REST_PREFIX + suffix + action + '/';
}

export function getStaticUrl(url: string): string {
    return environment.endpoint + url;
}

export function UB(path: (string| number)[]): string {
    return [environment.endpoint, ...path].join('/') + '/';
}
