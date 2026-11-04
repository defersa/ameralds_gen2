import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { AppSettingEntity } from "../app-setting.entity";
import { OrderPatternEntity } from "../patterns/pattern-order.entity";
import { UserEntity } from "../user.entity";
import { orderAmountTransformer, type OrderCurrency, type OrderDiscountSnapshot } from "./order-snapshot.model";
import { UserPaymentEntity } from "./payment.entity";


@Entity({ schema: "users" })
export class AdminOrderEntity extends BaseModel {
	@OneToMany(() => OrderPatternEntity, (pattern: OrderPatternEntity) => pattern.adminOrder)
	public patterns: OrderPatternEntity[];

	@Column({ nullable: true })
	public email?: string;

	@Column({ nullable: true })
	public vk?: string;

	@Column()
	public isComplete: boolean;
}

export enum OrderStatus {
	CANCELLED = "cancel",
	OPEN = "open",
	PENDING_PAYMENT = "pending_payment",
	// Значения в БД/API сохранены для совместимости старых покупок.
	PAID = "success",
	PARTIALLY_REFUNDED = "partially_refunded",
	REFUNDED = "refunded",
}

@Entity({ schema: "users" })
@Index("IDX_order_payment_expiration", { synchronize: false })
@Index("IDX_user_order_one_open", ["user"], {
	unique: true,
	where: `"status" = 'open' AND "state" = 'active' AND "userId" IS NOT NULL`,
})
@Check(
	"CHK_pending_order_payment_window",
	'"status" <> \'pending_payment\' OR ("paymentExpiresAt" IS NOT NULL AND "appSettingsVersion" IS NOT NULL)',
)
export class UserOrderEntity extends BaseModel {
	@OneToMany(() => OrderPatternEntity, (pattern: OrderPatternEntity) => pattern.order)
	public patterns: OrderPatternEntity[];

	@ManyToOne(() => UserEntity, (user: UserEntity) => user.orders, {
		onDelete: "SET NULL",
		nullable: true,
	})
	public user: UserEntity;

	@OneToOne(() => UserPaymentEntity, {
		onDelete: "SET NULL",
		nullable: true,
	})
	@JoinColumn()
	public payment: UserPaymentEntity;

	@OneToOne(() => AdminOrderEntity, {
		onDelete: "SET NULL",
		nullable: true,
	})
	@JoinColumn({ foreignKeyConstraintName: "FK_user_order_source_admin_order" })
	public sourceAdminOrder: AdminOrderEntity;

	@Column({
		type: "enum",
		enum: OrderStatus,
		default: OrderStatus.OPEN,
	})
	public status: OrderStatus;

	// OPEN и legacy-заказы могут не иметь достоверной исторической цены.
	@Column({
		type: "bigint",
		nullable: true,
		transformer: orderAmountTransformer,
	})
	public subtotalAmount: number | null;

	@Column({
		type: "bigint",
		default: 0,
		transformer: orderAmountTransformer,
	})
	public discountAmount: number;

	@Column({
		type: "bigint",
		nullable: true,
		transformer: orderAmountTransformer,
	})
	public totalAmount: number | null;

	@Column({
		type: "varchar",
		length: 3,
		nullable: true,
	})
	public currency: OrderCurrency | null;

	@Column({
		type: "jsonb",
		default: () => "'[]'::jsonb",
	})
	public discounts: OrderDiscountSnapshot[];

	@Column({
		type: "timestamptz",
		nullable: true,
	})
	public paidAt: Date | null;

	@Column({
		type: "timestamptz",
		nullable: true,
	})
	public paymentExpiresAt: Date | null;

	@Column({
		type: "integer",
		nullable: true,
	})
	public appSettingsVersion: number | null;

	@ManyToOne(() => AppSettingEntity, {
		nullable: true,
		onDelete: "RESTRICT",
	})
	@JoinColumn({
		name: "appSettingsVersion",
		referencedColumnName: "version",
		foreignKeyConstraintName: "FK_order_app_settings",
	})
	public appSettings: AppSettingEntity | null;

	@Column({
		type: "timestamptz",
		nullable: true,
	})
	public cancelledAt: Date | null;

	@Column({
		type: "varchar",
		nullable: true,
	})
	public cancelReason: string | null;
}
