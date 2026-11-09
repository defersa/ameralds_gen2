import { ApiProperty } from "@nestjs/swagger";
import { BaseEntityDto, LabelEntityDto, NumberEntityDto } from "../../../common/common.dto";
import type {
	OrderCurrency,
	OrderDiscountSnapshot,
	OrderPatternSnapshot,
	OrderPriceComponentSnapshot,
} from "../../../db/entities/purchases/order-snapshot.model";
import { OrderStatus } from "../../../db/entities/purchases/order.entity";
import { ImageDto } from "../../images/images.dto";
import { PatternEntityDto, PatternSizeDto } from "../../patterns/patterns.dto";
import { SizeDto } from "../../sizes/sizes.dto";


export class OrderDiscountSnapshotDto implements OrderDiscountSnapshot {
	@ApiProperty() public type: string;
	@ApiProperty() public name: string;
	@ApiProperty({
		description: "Discount in integer minor currency units",
		type: "integer",
		minimum: 0,
	})
	public amount: number;
	@ApiProperty({ required: false }) public sourceId?: string;
}

export class OrderPriceComponentSnapshotDto implements OrderPriceComponentSnapshot {
	@ApiProperty({
		enum: ["base", "size", "color"],
	})
	public type: OrderPriceComponentSnapshot["type"];
	@ApiProperty({
		type: "integer",
		minimum: 0,
	})
	public quantity: number;
	@ApiProperty({
		type: "integer",
		minimum: 0,
	})
	public unitAmount: number;
	@ApiProperty({
		type: "integer",
		minimum: 0,
	})
	public totalAmount: number;
}

export class OrderSnapshotNameDto {
	@ApiProperty() public ru: string;
	@ApiProperty({
		type: String,
		nullable: true,
	})
	public en: string | null;
}

export class OrderSnapshotSizeDto {
	@ApiProperty({ type: "integer" }) public patternSizeId: number;
	@ApiProperty({
		type: "integer",
		nullable: true,
	})
	public sizeId: number | null;
	@ApiProperty({
		type: "integer",
		nullable: true,
	})
	public value: number | null;
}

export class OrderPatternSnapshotDto implements OrderPatternSnapshot {
	@ApiProperty({ type: "integer" }) public patternId: number;
	@ApiProperty({
		type: OrderSnapshotNameDto,
		nullable: true,
	})
	public name: OrderSnapshotNameDto | null;
	@ApiProperty({
		type: OrderSnapshotSizeDto,
		isArray: true,
	})
	public sizes: OrderSnapshotSizeDto[];
	@ApiProperty() public color: boolean;
	@ApiProperty() public requiresPatternPurchase: boolean;
	@ApiProperty({
		enum: ["RUB", "USD"],
	})
	public currency: OrderCurrency;
	@ApiProperty({
		type: "integer",
		minimum: 0,
	})
	public subtotalAmount: number;
	@ApiProperty({
		type: "integer",
		minimum: 0,
	})
	public discountAmount: number;
	@ApiProperty({
		type: "integer",
		minimum: 0,
	})
	public totalAmount: number;
	@ApiProperty({
		type: OrderDiscountSnapshotDto,
		isArray: true,
	})
	public discounts: OrderDiscountSnapshotDto[];
	@ApiProperty({
		type: OrderPriceComponentSnapshotDto,
		isArray: true,
	})
	public components: OrderPriceComponentSnapshotDto[];
}

export class PatternWithPriceDto extends BaseEntityDto {
	@ApiProperty({
		description: "Base price of pattern",
		type: NumberEntityDto,
	})
	public basePrice: NumberEntityDto;

	@ApiProperty({
		description: "Additional price of pattern",
		type: NumberEntityDto,
	})
	public additionalPrice: NumberEntityDto;

	@ApiProperty({
		description: "Color price of pattern",
		type: NumberEntityDto,
	})
	public colorPrice: NumberEntityDto;
}

export class BaseShortOrderPatternDto extends BaseEntityDto {
	@ApiProperty({
		description: "Sizes ids",
		type: "number",
		isArray: true,
	})
	public sizes: number[];

	@ApiProperty({
		description: "Status of colors able",
		type: "boolean",
	})
	public color: boolean;

	@ApiProperty({
		description: "Whether base pattern purchase should be included",
		type: "boolean",
	})
	public requiresPatternPurchase: boolean;
}

export class ShortOrderPatternDto extends BaseShortOrderPatternDto {
	@ApiProperty({
		description: "Pattern with prices",
		type: PatternWithPriceDto,
	})
	public pattern: PatternWithPriceDto;
}

export class InputShortOrderPatternDto {
	@ApiProperty({
		description: "Sizes ids",
		type: "number",
		isArray: true,
	})
	public sizes: number[];

	@ApiProperty({
		description: "Status of colors able",
		type: "boolean",
	})
	public color: boolean;

	@ApiProperty({
		description: "Pattern id",
		type: "number",
	})
	public pattern: number;

	@ApiProperty({
		description: "Whether base pattern purchase should be included",
		type: "boolean",
	})
	public requiresPatternPurchase: boolean;
}

export class OrderPatternDto extends BaseEntityDto {
	@ApiProperty({
		description: "Sizes",
		type: PatternSizeDto,
		isArray: true,
	})
	public sizes: PatternSizeDto[];

	@ApiProperty({
		description: "Pattern",
		type: PatternEntityDto,
	})
	public pattern: PatternEntityDto;

	@ApiProperty({
		description: "Status of colors able",
		type: "boolean",
	})
	public color: boolean;
}

export class UserOrderDto extends BaseEntityDto {
	@ApiProperty({
		description: "Order status",
		enum: OrderStatus,
		enumName: "EnumOrderStatus",
	})
	public status: OrderStatus;

	@ApiProperty({
		description: "Patterns",
		type: ShortOrderPatternDto,
		isArray: true,
	})
	public patterns: ShortOrderPatternDto[];
}

export class CartOrderPatternSizeDto extends BaseEntityDto {
	@ApiProperty({
		description: "Selected size",
		type: SizeDto,
	})
	public size: SizeDto;
}

export class CartOrderPatternEntityDto extends PatternWithPriceDto {}

export class CartOrderPatternDto extends BaseEntityDto {
	@ApiProperty({
		description: "Sizes selected in cart",
		type: CartOrderPatternSizeDto,
		isArray: true,
	})
	public sizes: CartOrderPatternSizeDto[];

	@ApiProperty({
		description: "Pattern with prices",
		type: CartOrderPatternEntityDto,
	})
	public pattern: CartOrderPatternEntityDto;

	@ApiProperty({
		description: "Status of colors able",
		type: "boolean",
	})
	public color: boolean;

	@ApiProperty({
		description: "Whether base pattern purchase should be included",
		type: "boolean",
	})
	public requiresPatternPurchase: boolean;
}

export class CartOrderDto extends BaseEntityDto {
	@ApiProperty({
		description: "Order status",
		enum: OrderStatus,
		enumName: "EnumOrderStatus",
	})
	public status: OrderStatus;

	@ApiProperty({
		description: "Patterns in cart",
		type: CartOrderPatternDto,
		isArray: true,
	})
	public patterns: CartOrderPatternDto[];
}

export class CartDto {
	@ApiProperty({ type: String, description: "Отпечаток состава для явного подтверждения checkout" })
	public revision: string;

	@ApiProperty({
		description: "Pattern IDs whose selection was corrected or removed after checking current rights and catalogue",
		type: "integer",
		isArray: true,
	})
	public correctedPatternIds: number[];

	@ApiProperty({
		description: "Cart total price",
		type: NumberEntityDto,
	})
	public price: NumberEntityDto;

	@ApiProperty({
		description: "Current user order",
		type: CartOrderDto,
	})
	public cart: CartOrderDto;
}

export class PurchasedOrderPatternDto extends BaseEntityDto {
	@ApiProperty({
		description: "Immutable purchase snapshot; null for legacy purchases",
		type: OrderPatternSnapshotDto,
		nullable: true,
	})
	public snapshot: OrderPatternSnapshotDto | null;

	@ApiProperty({
		description: "Purchased pattern name, or null if unavailable",
		type: LabelEntityDto,
		nullable: true,
	})
	public name: LabelEntityDto | null;

	@ApiProperty({
		description: "Pattern images",
		type: ImageDto,
		isArray: true,
	})
	public images: ImageDto[];

	@ApiProperty({
		description: "Purchased sizes",
		type: CartOrderPatternSizeDto,
		isArray: true,
	})
	public sizes: CartOrderPatternSizeDto[];

	@ApiProperty({
		description: "Whether color selection was purchased",
		type: Boolean,
	})
	public color: boolean;
}

export class UserOrderDetailsDto extends BaseEntityDto {
	@ApiProperty({
		description: "Subtotal in minor units; null when historical price is unknown",
		type: "integer",
		nullable: true,
	})
	public subtotalAmount: number | null;

	@ApiProperty({
		description: "Discount in minor units",
		type: "integer",
		minimum: 0,
	})
	public discountAmount: number;

	@ApiProperty({
		description: "Total in minor units; null when historical price is unknown",
		type: "integer",
		nullable: true,
	})
	public totalAmount: number | null;

	@ApiProperty({
		enum: ["RUB", "USD"],
		nullable: true,
	})
	public currency: OrderCurrency | null;

	@ApiProperty({
		type: OrderDiscountSnapshotDto,
		isArray: true,
	})
	public discounts: OrderDiscountSnapshotDto[];

	@ApiProperty({
		type: Date,
		nullable: true,
	})
	public paymentExpiresAt: Date | null;
	@ApiProperty({
		type: Date,
		nullable: true,
	})
	public paidAt: Date | null;
	@ApiProperty({
		type: Date,
		nullable: true,
	})
	public cancelledAt: Date | null;
	@ApiProperty({
		type: String,
		nullable: true,
	})
	public cancelReason: string | null;

	@ApiProperty({
		description: "Completed order status",
		enum: OrderStatus,
		enumName: "EnumOrderStatus",
	})
	public status: OrderStatus;

	@ApiProperty({
		description: "Purchased patterns",
		type: PurchasedOrderPatternDto,
		isArray: true,
	})
	public patterns: PurchasedOrderPatternDto[];
}
