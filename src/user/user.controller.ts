import { Controller, Get } from "@nestjs/common";


@Controller("user")
export class UserController {
    constructor() {
    }

    @Get("person")
    getUser(): string {
        return "its user";
    }
}
