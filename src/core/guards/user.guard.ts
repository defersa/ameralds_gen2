import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from 'express';
import { UserService } from "@am/db/service/user/user.service";


@Injectable()
export class UserGuard implements CanActivate {
    constructor(
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // const request = context.switchToHttp().getRequest();
        // const token = this.extractTokenFromHeader(request);
        // if (!token) {
        //     throw new UnauthorizedException();
        // }
        // try {
        //     const payload = await this.jwtService.verifyAsync(
        //         token,
        //         {
        //             secret: jwtConstants.secret
        //         }
        //     );
        //     // 💡 We're assigning the payload to the request object here
        //     // so that we can access it in our route handlers
        //     request['user'] = payload;
        // } catch {
        //     throw new UnauthorizedException();
        // }
        // return true;
        return true;
    }
}
