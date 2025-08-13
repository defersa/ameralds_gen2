import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from "@am-back/db/service/user.service";


@Injectable()
export class UserMiddleware implements NestMiddleware {
    constructor(
        private userService: UserService,
    ) {}

    public async use(request: Request, res: Response, next: NextFunction) {
        const token: string = this.extractTokenFromHeader(request);

        if (token) {
            request['user'] = await this.userService.getUserByToken(token);

        }
        next();
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
