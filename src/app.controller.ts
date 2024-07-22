import { Controller, Get, Req } from "@nestjs/common";
import { AppService } from "./app.service";
import { Request } from 'express';


@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {
    }

    @Get('test')
    getHello(
        @Req() request: Request,
    ): string {

        console.log((request as any).user);

        return this.appService.getHello();
    }
}
