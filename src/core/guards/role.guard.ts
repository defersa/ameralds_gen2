import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { UserRole } from "@am/db/entities";
import { Reflector } from "@nestjs/core";


export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles: UserRole[] = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();

        return requiredRoles.some((role: UserRole) => user.roles?.includes(role));
    }
}
