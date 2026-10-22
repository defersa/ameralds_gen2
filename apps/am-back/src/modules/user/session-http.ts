import { applyDecorators, CanActivate, ExecutionContext, ForbiddenException, Injectable, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { ApiErrorCodes, ErrorsDto } from '../errors/errors.dto';
import { SessionTokens } from '../../db/services/token.service';

export const REFRESH_COOKIE_NAME = 'am_refresh';
const COOKIE_PATH = '/api/user/user';

@Injectable()
export class SessionRequestGuard implements CanActivate {
    public canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        // Произвольный сайт не может отправить этот заголовок без успешного CORS preflight.
        if (request.get('X-CSRF-Protection') !== '1' || request.get('Sec-Fetch-Site') === 'cross-site') {
            throw new ForbiddenException({ code: ApiErrorCodes.INVALID });
        }
        return true;
    }
}

@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
    protected override async throwThrottlingException(): Promise<void> {
        throw new HttpException({ code: ApiErrorCodes.TOO_MANY_REQUESTS }, HttpStatus.TOO_MANY_REQUESTS);
    }
}

export const SessionMutation = () => applyDecorators(
    UseGuards(SessionRequestGuard, AuthThrottleGuard),
    ApiHeader({ name: 'X-CSRF-Protection', required: true, schema: { type: 'string', enum: ['1'] } }),
    ApiTooManyRequestsResponse({ type: ErrorsDto }),
);

export const RefreshCookieAuth = () => ApiCookieAuth(REFRESH_COOKIE_NAME);

export function readRefreshCookie(request: Request): string | undefined {
    const cookies = (request.headers.cookie ?? '').split(';').map(value => value.trim());
    const values = cookies.filter(value => value.startsWith(REFRESH_COOKIE_NAME + '='));
    if (values.length !== 1) {
        return undefined;
    }
    try {
        return decodeURIComponent(values[0].slice(REFRESH_COOKIE_NAME.length + 1));
    } catch {
        return undefined;
    }
}

function cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: process.env.NODE_ENV !== 'dev' && process.env.NODE_ENV !== 'test', sameSite: 'strict', path: COOKIE_PATH };
}

export function setRefreshCookie(response: Response, tokens: SessionTokens): void {
    response.cookie(REFRESH_COOKIE_NAME, tokens.refresh, { ...cookieOptions(), expires: tokens.refreshExpiredAt });
    response.setHeader('Cache-Control', 'no-store');
}

export function clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, cookieOptions());
    response.setHeader('Cache-Control', 'no-store');
}
