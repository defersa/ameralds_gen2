import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiNoContentResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { UserService } from '@am-back/db/service/user.service';
import { EmailLoginRequestDto, EmailLoginResponseDto, EmailLoginTokenDto, UserCredentialsDto, UserProfileDto, UserRegistrationCredentialsDto, UserTokensDTO } from './user.dto';
import { ApiErrorCodes, ErrorsDto } from '../errors/errors.dto';
import { Auth } from '@am-back/core/guards/auth.guard';
import type { RequestModel } from '@am-back/models/request.model';
import { UserCredentialsPipe, UserRegistrationCredentialsPipe } from './user-credentials.pipe';
import { AuthEmailMutation, clearRefreshCookie, readRefreshCookie, RefreshCookieAuth, SessionMutation, setRefreshCookie } from './session-http';
import { EmailLoginService } from '../../db/services/email-login.service';
import { EmailAddressPipe } from './email-address.pipe';
import { AuthEmailService } from '../../db/services/auth-email.service';

@Controller('user')
@ApiTags('user')
export class UserController {
    constructor(private userService: UserService, private emailLoginService: EmailLoginService, private authEmail: AuthEmailService) {}

    @Post('email-login/request')
    @HttpCode(HttpStatus.NO_CONTENT)
    @AuthEmailMutation()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @ApiBody({ type: EmailLoginRequestDto })
    @ApiNoContentResponse({ description: 'Accepts the request for background processing. Status and body are identical for unknown, active and inactive accounts; SMTP delivery does not affect the response.' })
    @ApiBadRequestResponse({ type: ErrorsDto })
    public async requestEmailLogin(
        @Body('email', EmailAddressPipe) email: string,
        @Body('redirectPath') redirectPath?: string,
    ): Promise<void> {
        await this.authEmail.requestLogin(email, redirectPath);
    }

    @Post('email-login/consume')
    @HttpCode(HttpStatus.OK)
    @SessionMutation()
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @ApiBody({ type: EmailLoginTokenDto })
    @ApiOkResponse({ description: 'Consumes a single-use login or registration confirmation link, creates a browser session and returns its local destination. Refresh token is set as an HttpOnly cookie.', type: EmailLoginResponseDto })
    @ApiUnauthorizedResponse({ description: 'The link is invalid, expired, used or belongs to an inactive account.', type: ErrorsDto })
    public async signInByEmail(
        @Body('token') token: string,
        @Res({ passthrough: true }) response: Response,
    ): Promise<EmailLoginResponseDto> {
        const session = await this.emailLoginService.signIn(token);
        setRefreshCookie(response, session);
        return { access: session.access, redirectPath: session.redirectPath };
    }

    @Post('register')
    @HttpCode(HttpStatus.NO_CONTENT)
    @AuthEmailMutation()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @ApiNoContentResponse({ description: 'Accepts a registration request without revealing account existence. New accounts are created after email confirmation; existing accounts receive a login link without changes to their password.' })
    @ApiBadRequestResponse({ type: ErrorsDto })
    public async register(@Body(UserRegistrationCredentialsPipe) { email, password }: UserRegistrationCredentialsDto): Promise<void> {
        await this.authEmail.requestRegistration(email, password);
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
