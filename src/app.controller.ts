import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import * as bcrypt from "bcrypt";


@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {
    }

    @Get()
    getHello(): string {

        console.log("?(");
        this.test();

        return this.appService.getHello();
    }

    private async test(): Promise<void> {
        const salt: string = await bcrypt.genSalt();
        const password = "random_password";
        const hash = await bcrypt.hash(password, salt);
        console.log(salt, hash)

        console.log(await bcrypt.compare(password, hash));
    }

}
