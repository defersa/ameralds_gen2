import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RequestModel } from "@am/models/request.model";


export const AUTH_KEY = 'auth';
export const Auth = () => SetMetadata(AUTH_KEY, true);

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

        return Boolean(user);
    }
}
