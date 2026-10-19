import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { process } from '@am-back/core/declare/process';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import 'reflect-metadata';
import { getUploadsRoot } from './utils/path-with-dir';

declare const module: any;

async function bootstrap() {
    if (module.hot?.data?.closePromise) {
        // wait for the previous application instance to fully shut down
        await module.hot.data.closePromise;
    }

    const app: NestExpressApplication = await NestFactory.create(AppModule, {
        forceCloseConnections: !!module.hot,
    });

    const isDev = process.env.NODE_ENV === 'dev';

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    imgSrc: ["'self'", 'data:', 'blob:'],
                    connectSrc: ["'self'"],
                    scriptSrc: [
                        "'self'",
                        ...(isDev ? ["'unsafe-inline'"] : []),
                    ],
                    styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
                    upgradeInsecureRequests: isDev ? null : [],
                },
            },
            crossOriginResourcePolicy: { policy: 'same-site' },
            referrerPolicy: { policy: 'no-referrer' },
            strictTransportSecurity: isDev
                ? false
                : {
                      maxAge: 31536000,
                      includeSubDomains: true,
                  },
        }),
    );

    app.setGlobalPrefix('api');

    if (module.hot) {
        module.hot.accept();
        module.hot.dispose((data: any) => {
            data.closePromise = app.close();
        });
    }

    app.useStaticAssets(join(getUploadsRoot(), 'public'), {
        prefix: '/uploads/public/',
    });

    await app.listen(3000);
    Logger.log('Backend is running on http://localhost:3000', 'Bootstrap');
}

bootstrap();
