import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ApiErrorCodes } from '../errors/errors.dto';

@Injectable()
export class EmailAddressPipe implements PipeTransform<unknown, string> {
    public transform(email: unknown): string {
        if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID_EMAIL });
        }
        return email.trim().toLowerCase();
    }
}
