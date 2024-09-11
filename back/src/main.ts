import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { INestApplication } from "@nestjs/common";
import { process } from "@am/core/declare/process";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";


async function bootstrap() {
    const app: INestApplication = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api');

    if (process.env.NODE_ENV === 'dev') {
        const config = new DocumentBuilder()
            .setTitle('Ameralds api')
            .setDescription('The amerald API description')
            .setVersion('1.0')
            .setBasePath('api')
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('swagger', app, document, { jsonDocumentUrl: 'swagger/schema' });
    }

    await app.listen(3000);
}

bootstrap();
