import { Body, Controller, Get, HttpException, HttpStatus, Post, Req } from "@nestjs/common";
import { UserService } from "@am/db/service/user.service";
import { UserEntity } from "@am/db/entities";
import * as bcrypt from "bcrypt";
import {
    LogoutCredentialsDto,
    RefreshTokenCredentialsDto,
    UserCredentialsDto,
    UserProfileDto,
    UserTokensDTO
} from "./user.dto";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiErrorCodes, ErrorsDto } from "../errors/errors.dto";
import { Auth } from "@am/core/guards/auth.guard";
import { RequestModel } from "@am/models/request.model";



const passwordComplexCheck: RegExp = /(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z!@#$%^&*]{6,}/g;
const emailCheck: RegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;


@Controller()
@ApiTags('user')
export class UserController {
    constructor(
        private userService: UserService,
    ) {
    }

    @Post('register')
    @ApiCreatedResponse({ description: 'The user has been successfully created.', type: String })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async register(
        @Body() { email, password }: UserCredentialsDto,
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
    @ApiOkResponse({ description: 'The user has been successfully authenticated.', type: UserTokensDTO })
    public async signIn(
        @Body() { email, password }: UserCredentialsDto,
    ): Promise<UserTokensDTO> {
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

    @Post('refresh')
    @ApiOkResponse({ description: 'The auth token has been successfully refreshed.', type: UserTokensDTO })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async refresh(
        @Body() { refresh, access }: RefreshTokenCredentialsDto,
    ): Promise<UserTokensDTO> {
        const response: UserTokensDTO = await this.userService.refreshToken(access, refresh);

        if (!response) {
            throw new HttpException({ code: ApiErrorCodes.EXPIRED }, HttpStatus.BAD_REQUEST);
        }

        return response;
    }


    @Post('logout')
    @ApiOkResponse({ description: 'User has been logout.', type: null })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async logout(
        @Req() request: RequestModel,
        @Body() { refresh, access }: LogoutCredentialsDto,
    ): Promise<void> {
        return this.userService.logout(request.user, access, refresh);
    }

    @Get('profile')
    @Auth()
    @ApiOkResponse({ description: 'Request of user profile.', type: UserProfileDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async profile(
        @Req() request: RequestModel
    ): Promise<UserProfileDto> {
        return {
            username: request.user.username,
            email: request.user.email,
            role: request.user.role,
        };
    }
}
