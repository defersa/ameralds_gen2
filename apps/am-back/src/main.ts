import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { process } from "@am-back/core/declare/process";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import helmet from "helmet";
import 'reflect-metadata';


async function bootstrap() {
    const app: NestExpressApplication = await NestFactory.create(AppModule);
    const isDev = process.env.NODE_ENV === 'dev';

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"],
                scriptSrc: ["'self'", ...(isDev ? ["'unsafe-inline'"] : [])],
                styleSrc: ["'self'", "https:", "'unsafe-inline'"],
                upgradeInsecureRequests: isDev ? null : [],
            },
        },
        crossOriginResourcePolicy: { policy: "same-site" },
        referrerPolicy: { policy: "no-referrer" },
        strictTransportSecurity: isDev ? false : {
            maxAge: 31536000,
            includeSubDomains: true,
        },
    }));

    app.setGlobalPrefix('api');

    if (isDev) {
        const config = new DocumentBuilder()
            .setTitle('Ameralds api')
            .setDescription('The amerald API description')
            .setVersion('1.0')
            .setBasePath('api')
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('swagger', app, document, { jsonDocumentUrl: 'swagger/schema' });
    }

    console.log(join(__dirname, 'uploads/public'))
    app.useStaticAssets(join(__dirname, '../../../apps/am-back/uploads/public'), {
        prefix: '/uploads/public/'
    });

    await app.listen(3000);
}

bootstrap();
