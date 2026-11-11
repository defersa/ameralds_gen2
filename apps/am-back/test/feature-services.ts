import type { Provider, Type } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { DataSourceService } from "../src/db/data-source.service";
import { AppSettingsService } from "../src/db/services/app-settings/app-settings.service";
import { AppSettingsRepository } from "../src/db/services/app-settings/repositories/app-settings.repository";
import { PatternGrantsService } from '../src/db/services/pattern-grants/pattern-grants.service';
import { PatternGrantRepository } from '../src/db/services/pattern-grants/repositories/pattern-grant.repository';
import { UserPatternRepository } from '../src/db/services/pattern-grants/repositories/user-pattern.repository';
import { UserPatternService } from "../src/db/services/general/user-pattern.service";
import { AdminOrderMailService } from "../src/db/services/order/admin/admin-order-mail.service";
import { AdminOrderService } from "../src/db/services/order/admin/admin-order.service";
import { AdminCartService } from "../src/db/services/order/cart/admin-cart.service";
import { UserCartService } from "../src/db/services/order/cart/user-cart.service";
import { PlaceOrderService } from "../src/db/services/order/checkout/place-order.service";
import { OrderCheckoutService } from "../src/db/services/order/checkout/order-checkout.service";
import { OrderExpirationService } from "../src/db/services/order/checkout/order-expiration.service";
import { AdminOrderRepository } from "../src/db/services/order/repositories/admin-order.repository";
import { OrderPatternRepository } from "../src/db/services/order/repositories/order-pattern.repository";
import { UserOrderRepository } from "../src/db/services/order/repositories/user-order.repository";
import { UserOrderService } from "../src/db/services/order/user/user-order.service";
import { CancelUserOrderService } from "../src/db/services/order/user/cancel-user-order.service";
import { PatternsService } from "../src/db/services/patterns/patterns.service";
import { TokenService } from "../src/db/services/token.service";
import { UserService } from "../src/db/services/user.service";


/**
 * Создаёт тестовый Nest-контейнер с указанными подменами провайдеров и возвращает экземпляр проверяемого
 * сервиса.
 */
export async function testService<T>(target: Type<T>, providers: Provider[]): Promise<T> {
	const module = await Test.createTestingModule({
		providers: [target, ...providers],
	}).compile();

	return module.get(target);
}

/**
 * Создаёт настоящий экземпляр пользовательского репозитория без подключения к БД и подменяет переданные
 * методы для unit-тестов.
 */
export function repositoryFixture<T>(target: new (source: DataSource) => T, overrides: Partial<T>): T {
	return Object.assign(new target(new DataSource({ type: "postgres" })), overrides);
}

const settingsProviders = [AppSettingsRepository, AppSettingsService];
const orderRepositories = [UserOrderRepository, AdminOrderRepository, OrderPatternRepository];

/**
 * Собирает интеграционный Nest-модуль настроек и оформления заказов с переданным подключением к тестовой
 * БД.
 */
export function settingsTestModule(db: DataSource): Promise<TestingModule> {
	return Test.createTestingModule({
		providers: [
			...settingsProviders,
			...orderRepositories,
			OrderCheckoutService,
			OrderExpirationService,
			{
				provide: DataSource,
				useValue: db,
			},
		],
	}).compile();
}

/**
 * Собирает интеграционный Nest-модуль заказов с реальными репозиториями и тестовыми подменами каталога,
 * токенов и отправки писем.
 */
export function orderTestModule(db: DataSource): Promise<TestingModule> {
	return Test.createTestingModule({
		providers: [
			...settingsProviders,
			...orderRepositories,
			OrderCheckoutService,
			PlaceOrderService,
			OrderExpirationService,
			UserCartService,
			AdminCartService,
			UserOrderService,
			CancelUserOrderService,
			AdminOrderService,
			UserService,
			UserPatternService,
			PatternGrantsService,
			PatternGrantRepository,
			UserPatternRepository,
			DataSourceService,
			{
				provide: DataSource,
				useValue: db,
			},
			{
				provide: TokenService,
				useValue: {},
			},
			{
				provide: PatternsService,
				useValue: {
					patternsById: jest.fn(),
				},
			},
			{
				provide: AdminOrderMailService,
				useValue: {
					sendCompletedOrder: jest.fn(),
				},
			},
		],
	}).compile();
}
