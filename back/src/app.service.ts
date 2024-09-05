import { Injectable } from "@nestjs/common";
import { process } from "@am/core/declare/process";


@Injectable()
export class AppService {
    getHello(): string {
        return "Hello World!";
    }
}
