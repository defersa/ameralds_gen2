import { Check, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import type { StoredAppSettings } from '../services/app-settings/app-settings.schema';

/** Не наследует BaseModel: у версий нет updatedAt, state и операций soft delete. */
@Entity()
@Check('CHK_app_setting_version', '"version" > 0')
@Check('CHK_app_setting_snapshot', 'jsonb_typeof("snapshot") = \'object\'')
export class AppSettingEntity {
    @PrimaryColumn({ type: 'integer', primaryKeyConstraintName: 'PK_app_setting_version' })
    public version: number;

    @Column({ type: 'jsonb' })
    public snapshot: StoredAppSettings;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt: Date;

    @Column({ type: 'integer', nullable: true })
    public createdById: number | null;

    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'createdById', foreignKeyConstraintName: 'FK_app_setting_created_by' })
    public createdBy: UserEntity | null;
}
