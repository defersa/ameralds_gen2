import type { INestApplication, Provider } from "@nestjs/common";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { JWT_MODULE_OPTIONS } from "@nestjs/jwt/dist/jwt.constants";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppModule } from "../apps/am-back/src/app.module";
import { DbInfrastructureModule } from "../apps/am-back/src/db/db-infrastructure.module";
import { AppSettingsDomainModule } from "../apps/am-back/src/db/services/app-settings/app-settings.module";
import { OrderDomainModule } from "../apps/am-back/src/db/services/order/order.module";
import { normalizeOpenApiNullability } from "./normalize-openapi-nullability";


const root = resolve(__dirname, "..");
const schemaPath = resolve(root, "dist/openapi/schema.json");

/**
 * Создаёт временное Nest-приложение для Swagger с подменёнными провайдерами, без подключения БД и запуска
 * HTTP-сервера.
 */
async function createSwaggerApplication(): Promise<INestApplication> {
	const builder = Test.createTestingModule({
		imports: [AppModule],
	});

	// Для описания контроллеров не нужны подключения к БД и экземпляры сервисов.
	builder.overrideProvider(DataSource).useValue({ isInitialized: false });
	builder.overrideProvider(JWT_MODULE_OPTIONS).useValue({});

	const providers: Provider[] = [DbInfrastructureModule, AppSettingsDomainModule, OrderDomainModule]
		.flatMap(
			(module) => Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) ?? [],
		);

	for (const provider of providers) {
		const token = typeof provider === "function" ? provider : provider.provide;

		builder.overrideProvider(token).useValue({});
	}

	const moduleRef = await builder.compile();

	return moduleRef.createNestApplication();
}

/**
 * Запускает CLI генерации клиента отдельным процессом и отклоняет Promise при ошибке запуска или ненулевом
 * завершении.
 */
function generateClient(): Promise<void> {
	return new Promise((complete, reject) => {
		const child = spawn(process.execPath, [require.resolve("ng-openapi/cli.cjs"), "-c", "openapi.config.ts"], {
			cwd: resolve(root, "apps/am-front"),
			stdio: "inherit",
		});

		child.once("error", reject);
		child.once("exit", (code, signal) => {
			if (code === 0) {
				complete();
			} else {
				reject(
					new Error(`Генерация API-клиента завершилась с ${signal ? `сигналом ${signal}` : `кодом ${code}`}`),
				);
			}
		});
	});
}

/**
 * Строит и нормализует Swagger-схему, записывает её и генерирует frontend-клиент; временное приложение
 * закрывает даже при ошибке.
 */
export async function generateFrontApi(): Promise<void> {
	const app = await createSwaggerApplication();

	try {
		app.setGlobalPrefix("api");

		const config = new DocumentBuilder()
			.setTitle("Ameralds api")
			.setDescription("The amerald API description")
			.setVersion("1.0")
			.addBearerAuth()
			.addCookieAuth(
				"am_refresh",
				{
					type: "apiKey",
					in: "cookie",
				},
				"am_refresh",
			)
			.build();

		const document = normalizeOpenApiNullability(SwaggerModule.createDocument(app, config));

		await mkdir(dirname(schemaPath), { recursive: true });
		await writeFile(schemaPath, `${JSON.stringify(document, null, 2)}\n`);
		console.log(`Swagger-схема: ${schemaPath}`);
		await generateClient();
	} finally {
		await app.close();
	}
}
