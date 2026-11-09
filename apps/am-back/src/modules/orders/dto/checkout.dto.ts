import { CheckoutConflictReason } from "@ameralds/utils";
import { ApiProperty } from "@nestjs/swagger";
import type { OrderCurrency } from "@am-back/db/entities/purchases/order-snapshot.model";
import { ErrorsDto } from "@am-back/modules/errors/errors.dto";
import { UserOrderDetailsDto } from "./orders.dto";


export class CheckoutInputDto {
	@ApiProperty({
		type: "integer",
		minimum: 1,
		description: "ID исходной OPEN-корзины; устойчивый ключ повторного оформления, не ID пользователя",
	})
	public cartId: number;

	@ApiProperty({ type: String, description: "Отпечаток состава из последнего подтверждённого ответа корзины" })
	public cartRevision: string;

	@ApiProperty({ enum: ["RUB", "USD"] })
	public currency: OrderCurrency;
}

export class CheckoutOrderDto extends UserOrderDetailsDto {
	@ApiProperty({ type: Date, description: "Зафиксированное время оформления" })
	public placedAt: Date;

	@ApiProperty({ type: "integer", description: "Версия настроек срока оплаты при оформлении" })
	public appSettingsVersion: number;
}

export class CheckoutConflictItemDto {
	@ApiProperty({ type: "integer" })
	public itemId: number;

	@ApiProperty({ type: "integer", nullable: true })
	public patternId: number | null;

	@ApiProperty({ type: String, nullable: true })
	public name: string | null;

	@ApiProperty({ type: "integer", isArray: true })
	public sizeIds: number[];

	@ApiProperty({ type: Boolean })
	public color: boolean;

	@ApiProperty({
		enum: CheckoutConflictReason,
		enumName: "EnumCheckoutConflictReason",
		isArray: true,
		description: "Причины конфликта оформления корзины",
	})
	public reasons: CheckoutConflictReason[];
}

export class CheckoutConflictDto extends ErrorsDto {
	@ApiProperty({ type: CheckoutConflictItemDto, isArray: true })
	public items: CheckoutConflictItemDto[];
}
