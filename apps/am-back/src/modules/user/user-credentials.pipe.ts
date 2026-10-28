import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ApiErrorCodes } from '../errors/errors.dto';
import { UserCredentialsDto } from './user.dto';
import { EmailAddressPipe } from './email-address.pipe';
import { isStrongPassword } from '@ameralds/utils';

@Injectable()
export class UserCredentialsPipe implements PipeTransform<unknown, UserCredentialsDto> {
    public transform(value: unknown): UserCredentialsDto {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID });
        }
        const { email, password } = value as Record<string, unknown>;
        const normalizedEmail = new EmailAddressPipe().transform(email);
        if (typeof password !== 'string' || !password.length || Buffer.byteLength(password, 'utf8') > 1024) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID_PASSWORD });
        }
        return { email: normalizedEmail, password };
    }
}

@Injectable()
export class UserRegistrationCredentialsPipe extends UserCredentialsPipe {
    public override transform(value: unknown): UserCredentialsDto {
        const credentials = super.transform(value);
        if (!isStrongPassword(credentials.password)) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID_PASSWORD });
        }
        return credentials;
    }
}
