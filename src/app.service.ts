import { Injectable } from "@nestjs/common";
import { process } from "@am/core/declare/process";


@Injectable()
export class AppService {
    getHello(): string {
        console.log(process.env.SOME)
        return "Hello World!";
    }
}
