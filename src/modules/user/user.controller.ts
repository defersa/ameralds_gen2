import { Body, Controller, HttpException, HttpStatus, Post } from "@nestjs/common";
import { TokensDTO, UserService } from "@am/db/service/user/user.service";
import { UserEntity } from "@am/db/entities";
import * as bcrypt from "bcrypt";


enum ApiErrorCodes {
    ALREADY_EXIST = 'ALREADY_EXIST',
    INVALID_PASSWORD = 'INVALID_PASSWORD',
    INVALID_EMAIL = 'INVALID_EMAIL',

    NOT_EXIST = 'NOT_EXIST',
    INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
}

const passwordComplexCheck: RegExp = /(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z!@#$%^&*]{6,}/g;
const emailCheck: RegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export interface RegisterDTO {
    email: string;
    password: string;
}

@Controller()
export class UserController {
    constructor(
        private userService: UserService,
    ) {
    }

    @Post('register')
    public async register(
        @Body() { email, password }: RegisterDTO,
    ): Promise<string> {
        if (await this.userService.getUserByEmail(email)) {
            throw new HttpException({ code: ApiErrorCodes.ALREADY_EXIST }, HttpStatus.BAD_REQUEST);
        }

        if (!passwordComplexCheck.test(password)) {
            throw new HttpException({ code: ApiErrorCodes.INVALID_PASSWORD }, HttpStatus.BAD_REQUEST);
        }

        if (!emailCheck.test(email)) {
            throw new HttpException({ code: ApiErrorCodes.INVALID_EMAIL }, HttpStatus.BAD_REQUEST);
        }

        return (await this.userService.creatUser(email, password)).email;
    }

    @Post('sign-in')
    public async signIn(
        @Body() { email, password }: RegisterDTO,
    ): Promise<TokensDTO> {
        const user: UserEntity = await this.userService.getUserByEmail(email);

        if (!user) {
            throw new HttpException({ code: ApiErrorCodes.NOT_EXIST }, HttpStatus.BAD_REQUEST);
        }

        const isCorrectPassword: boolean = await bcrypt.compare(password, user.passwordHash);

        if (!isCorrectPassword) {
            throw new HttpException({ code: ApiErrorCodes.INCORRECT_PASSWORD }, HttpStatus.BAD_REQUEST);
        }

        return this.userService.createAccessToken(user);
    }
}
