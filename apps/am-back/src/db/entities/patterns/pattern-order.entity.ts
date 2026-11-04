import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import type { OrderPatternSnapshot } from "../purchases/order-snapshot.model";
import { AdminOrderEntity, UserOrderEntity } from "../purchases/order.entity";
import { UserEntity } from "../user.entity";
import { PatternSizeEntity } from "./pattern-size.entity";
import { PatternEntity } from "./pattern.entity";


export abstract class SelectedPatternEntity extends BaseModel {
	@ManyToMany(() => PatternSizeEntity, {
		nullable: true,
		onDelete: "SET NULL",
	})
	@JoinTable()
	public sizes: PatternSizeEntity[];

	@Column({
		type: "boolean",
		default: false,
	})
	public color: boolean;
}

@Entity({ schema: "patterns" })
export class OrderPatternEntity extends SelectedPatternEntity {
	@Column({
		type: "jsonb",
		nullable: true,
	})
	public snapshot: OrderPatternSnapshot | null;

	@ManyToOne(() => PatternEntity, (pattern: PatternEntity) => pattern.orders, {
		onDelete: "SET NULL",
		nullable: true,
	})
	public pattern: PatternEntity;

	@ManyToOne(() => UserOrderEntity, (order: UserOrderEntity) => order.patterns, {
		onDelete: "SET NULL",
		nullable: true,
	})
	public order: UserOrderEntity;

	@ManyToOne(() => AdminOrderEntity, (order: AdminOrderEntity) => order.patterns, {
		onDelete: "SET NULL",
		nullable: true,
	})
	public adminOrder: AdminOrderEntity;

	@Column({
		type: "boolean",
		default: false,
	})
	public requiresPatternPurchase: boolean;
}

@Entity({ schema: "patterns" })
export class UserPatternEntity extends SelectedPatternEntity {
	@ManyToOne(() => PatternEntity, (pattern: PatternEntity) => pattern.own, {
		onDelete: "SET NULL",
		nullable: true,
	})
	public pattern: PatternEntity;

	@ManyToOne(() => UserEntity, (user: UserEntity) => user.ownPatterns, {
		onDelete: "SET NULL",
		nullable: true,
	})
	public user: UserEntity;
}
