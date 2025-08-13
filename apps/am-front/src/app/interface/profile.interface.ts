
export interface IUser {
    id: number;
    username: string;
    email: string;
    date_joined: string;
    is_staff: boolean;
    person: {
        verify: boolean;
        location: 'ru' | 'en';
        goods?: any;
        patterns?: { id: number }[];
    }
}

export type AuthRequestPayload = {
    username: string;
    password: string;
}

export interface IAuthResponse {
    name?: string;
    access?: string;
    refresh?: string;
    error?: string;
}

export type IRefreshToken = {
    access: string;
}
