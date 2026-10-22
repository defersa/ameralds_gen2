import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ApiErrorCodes } from '../errors/errors.dto';
import { UserCredentialsDto } from './user.dto';

@Injectable()
export class UserCredentialsPipe implements PipeTransform<unknown, UserCredentialsDto> {
    public transform(value: unknown): UserCredentialsDto {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID });
        }
        const { email, password } = value as Record<string, unknown>;
        if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID_EMAIL });
        }
        if (typeof password !== 'string' || !password.length || Buffer.byteLength(password, 'utf8') > 1024) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID_PASSWORD });
        }
        return { email: email.trim().toLowerCase(), password };
    }
}
