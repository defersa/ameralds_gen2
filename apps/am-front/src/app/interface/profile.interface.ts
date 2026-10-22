
import type { UserTokensDTO } from '@am-front/root/api-v2';

export interface IUser {
    id: number;
    username: string;
    email: string;
    date_joined: string;
    is_staff: boolean;
    person: {
        verify: boolean;
        location: 'ru' | 'en';
        goods?: unknown;
        patterns?: { id: number }[];
    }
}

export type AuthRequestPayload = {
    username: string;
    password: string;
}

export type IAuthResponse = UserTokensDTO;
