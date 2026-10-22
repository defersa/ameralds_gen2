import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from '@nestjs/config';
import { EnvConfigModule } from '../config/env-config.module';

export const JWT_ISSUER = 'ameralds';
export const JWT_AUDIENCE = 'ameralds-browser';


@Module({
    imports: [
        JwtModule.registerAsync({
            global: true,
            imports: [EnvConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.getOrThrow<string>('JWT_SECRET');
                if (config.get('NODE_ENV') !== 'dev' && secret.length < 32) {
                    throw new Error('JWT_SECRET must contain at least 32 characters outside development');
                }
                return {
                    secret,
                    signOptions: { algorithm: 'HS256', issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
                    verifyOptions: { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
                };
            },
        }),
    ],
})
export class AmJwtModule {}
