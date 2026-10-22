import { applyDecorators, CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth } from '@nestjs/swagger';
import { Reflector } from "@nestjs/core";
import type { RequestModel } from "@am-back/models/request.model";
import { ApiErrorCodes } from '../../modules/errors/errors.dto';


export const AUTH_KEY = 'auth';
export const Auth = () => applyDecorators(SetMetadata(AUTH_KEY, true), ApiBearerAuth());

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredAuth: boolean = this.reflector.getAllAndOverride<boolean>(AUTH_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredAuth) {
            return true;
        }
        const { user }: RequestModel = context.switchToHttp().getRequest();

        if (!user) {
            throw new UnauthorizedException({ code: ApiErrorCodes.UNAUTHORIZED });
        }

        return true;
    }
}
