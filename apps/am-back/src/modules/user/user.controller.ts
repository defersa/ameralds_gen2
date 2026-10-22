import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { UserService } from '@am-back/db/service/user.service';
import { UserCredentialsDto, UserProfileDto, UserRegistrationCredentialsDto, UserTokensDTO } from './user.dto';
import { ApiErrorCodes, ErrorsDto } from '../errors/errors.dto';
import { Auth } from '@am-back/core/guards/auth.guard';
import type { RequestModel } from '@am-back/models/request.model';
import { SuccessCreateDto } from '../../common/common.dto';
import { UserCredentialsPipe } from './user-credentials.pipe';
import { clearRefreshCookie, readRefreshCookie, RefreshCookieAuth, SessionMutation, setRefreshCookie } from './session-http';
import { isStrongPassword } from '@ameralds/utils';

@Controller('user')
@ApiTags('user')
export class UserController {
    constructor(private userService: UserService) {}

    @Post('register')
    @SessionMutation()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @ApiCreatedResponse({ description: 'The user has been successfully created.', type: SuccessCreateDto })
    @ApiBadRequestResponse({ type: ErrorsDto })
    public async register(@Body(UserCredentialsPipe) { email, password }: UserRegistrationCredentialsDto): Promise<SuccessCreateDto> {
        if (!isStrongPassword(password)) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID_PASSWORD });
        }
        if (await this.userService.getUserByEmail(email)) {
            throw new BadRequestException({ code: ApiErrorCodes.ALREADY_EXIST });
        }
        const user = await this.userService.creatUser(email, password);
        return { id: user.id };
    }

    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    @SessionMutation()
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @ApiOkResponse({ description: 'Access token; refresh token is set as an HttpOnly cookie.', type: UserTokensDTO })
    @ApiUnauthorizedResponse({ type: ErrorsDto })
    @ApiBadRequestResponse({ type: ErrorsDto })
    public async signIn(
        @Body(UserCredentialsPipe) { email, password }: UserCredentialsDto,
        @Res({ passthrough: true }) response: Response,
    ): Promise<UserTokensDTO> {
        const tokens = await this.userService.signIn(email, password);
        setRefreshCookie(response, tokens);
        return { access: tokens.access };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @SessionMutation()
    @RefreshCookieAuth()
    @ApiOkResponse({ description: 'Rotates the refresh cookie and issues a new access token.', type: UserTokensDTO })
    @ApiUnauthorizedResponse({ type: ErrorsDto })
    public async refresh(@Req() request: RequestModel, @Res({ passthrough: true }) response: Response): Promise<UserTokensDTO> {
        const tokens = await this.userService.refreshToken(readRefreshCookie(request));
        if (!tokens) {
            clearRefreshCookie(response);
            throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
        }
        setRefreshCookie(response, tokens);
        return { access: tokens.access };
    }

    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @SessionMutation()
    @RefreshCookieAuth()
    @ApiNoContentResponse({ description: 'The session has been revoked and the refresh cookie cleared.' })
    public async logout(@Req() request: RequestModel, @Res({ passthrough: true }) response: Response): Promise<void> {
        await this.userService.logout(readRefreshCookie(request));
        clearRefreshCookie(response);
    }

    @Get('profile')
    @Auth()
    @ApiOkResponse({ type: UserProfileDto })
    @ApiUnauthorizedResponse({ type: ErrorsDto })
    public async profile(@Req() request: RequestModel, @Res({ passthrough: true }) response: Response): Promise<UserProfileDto> {
        response.setHeader('Cache-Control', 'no-store');
        return this.userService.getUser(request.user.id);
    }
}
