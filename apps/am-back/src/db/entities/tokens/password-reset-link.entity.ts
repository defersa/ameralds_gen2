import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "../user.entity";


@Entity({
	schema: "users",
	name: "password_reset_link",
})
@Index("uq_password_reset_link_token_hash", ["tokenHash"], { unique: true })
@Index("idx_password_reset_link_user_id", ["userId"])
@Index("idx_password_reset_link_expires_at", ["expiresAt"])
export class PasswordResetLinkEntity {
	@PrimaryGeneratedColumn({ primaryKeyConstraintName: "pk_password_reset_link_id" })
	public id: number;

	@CreateDateColumn({
		name: "created_at",
		type: "timestamp",
	})
	public createdAt: Date;

	@Column({
		name: "user_id",
		type: "integer",
	})
	public userId: number;

	@ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
	@JoinColumn({
		name: "user_id",
		foreignKeyConstraintName: "fk_password_reset_link_user_id",
	})
	public user: UserEntity;

	@Column({
		name: "email",
		type: "varchar",
		length: 254,
	})
	public email: string;

	@Column({
		name: "auth_version",
		type: "integer",
	})
	public authVersion: number;

	@Column({
		name: "token_hash",
		type: "varchar",
		length: 64,
		select: false,
	})
	public tokenHash: string;

	@Column({
		name: "expires_at",
		type: "timestamp",
	})
	public expiresAt: Date;

	@Column({
		name: "used_at",
		type: "timestamp",
		nullable: true,
	})
	public usedAt: Date | null;
}
