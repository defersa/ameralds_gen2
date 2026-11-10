import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../user.entity';
import { UserOrderEntity } from '../purchases/order.entity';
import { OrderPatternEntity, UserPatternEntity } from './pattern-order.entity';


export type PatternGrantSource = 'order' | 'admin_order' | 'legacy';

@Entity({ schema: 'patterns', name: 'user_pattern_grant' })
@Index('uq_pattern_grant_order_right', ['orderItemId', 'rightKey'], { unique: true })
@Index('uq_pattern_grant_legacy_right', ['legacyPurchaseId', 'rightKey'], { unique: true })
@Index('idx_pattern_grant_effective', ['userId', 'patternId'], { where: 'revoked_at IS NULL' })
@Check('chk_pattern_grant_right', "(pattern_size_id IS NULL AND right_key = 'color') OR (pattern_size_id IS NOT NULL AND right_key = 'size:' || pattern_size_id::text)")
@Check('chk_pattern_grant_source', "(source_type IN ('order', 'admin_order') AND order_id IS NOT NULL AND order_item_id IS NOT NULL AND legacy_purchase_id IS NULL) OR (source_type = 'legacy' AND order_id IS NULL AND order_item_id IS NULL AND legacy_purchase_id IS NOT NULL)")
@Check('chk_pattern_grant_revocation', '(revoked_at IS NULL AND revoke_reason IS NULL AND revoked_by IS NULL AND refund_reference IS NULL) OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL AND length(trim(revoke_reason)) > 0)')
export class UserPatternGrantEntity {
    @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'pk_user_pattern_grant_id' })
    public id: number;

    @Column({ name: 'user_id', type: 'integer' })
    public userId: number;

    @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_pattern_grant_user' })
    public user: UserEntity;

    // Исторические ID сохраняются после удаления каталога; доступ требует живых активных связей проекции.
    @Column({ name: 'pattern_id', type: 'integer' })
    public patternId: number;

    @Column({ name: 'pattern_size_id', type: 'integer', nullable: true })
    public patternSizeId: number | null;

    @Column({ name: 'right_key', type: 'varchar', length: 40 })
    public rightKey: string;

    @Column({ name: 'source_type', type: 'varchar', length: 20 })
    public sourceType: PatternGrantSource;

    @Column({ name: 'order_id', type: 'integer', nullable: true })
    public orderId: number | null;

    @ManyToOne(() => UserOrderEntity, { onDelete: 'RESTRICT', nullable: true })
    @JoinColumn({ name: 'order_id', foreignKeyConstraintName: 'fk_pattern_grant_order' })
    public order: UserOrderEntity | null;

    @Column({ name: 'order_item_id', type: 'integer', nullable: true })
    public orderItemId: number | null;

    @ManyToOne(() => OrderPatternEntity, { onDelete: 'RESTRICT', nullable: true })
    @JoinColumn({ name: 'order_item_id', foreignKeyConstraintName: 'fk_pattern_grant_order_item' })
    public orderItem: OrderPatternEntity | null;

    @Column({ name: 'legacy_purchase_id', type: 'integer', nullable: true })
    public legacyPurchaseId: number | null;

    @ManyToOne(() => UserPatternEntity, { onDelete: 'RESTRICT', nullable: true })
    @JoinColumn({ name: 'legacy_purchase_id', foreignKeyConstraintName: 'fk_pattern_grant_legacy' })
    public legacyPurchase: UserPatternEntity | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    public createdAt: Date;

    @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
    public revokedAt: Date | null;

    @Column({ name: 'revoke_reason', type: 'text', nullable: true })
    public revokeReason: string | null;

    @Column({ name: 'revoked_by', type: 'integer', nullable: true })
    public revokedBy: number | null;

    @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT', nullable: true })
    @JoinColumn({ name: 'revoked_by', foreignKeyConstraintName: 'fk_pattern_grant_actor' })
    public revokedByUser: UserEntity | null;

    @Column({ name: 'refund_reference', type: 'varchar', length: 255, nullable: true })
    public refundReference: string | null;

    @Column({ name: 'migrated', type: 'boolean', default: false })
    public migrated: boolean;
}
