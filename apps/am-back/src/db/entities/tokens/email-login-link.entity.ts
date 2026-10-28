import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../../abstract/abstract.model';
import { UserEntity } from '../user.entity';

@Entity({ schema: 'users' })
@Check('CHK_email_login_link_subject', `("userId" IS NOT NULL AND "registrationEmail" IS NULL AND "registrationPasswordHash" IS NULL) OR ("userId" IS NULL AND "registrationEmail" IS NOT NULL AND "registrationPasswordHash" IS NOT NULL)`)
export class EmailLoginLinkEntity extends BaseModel {
    @Index('IDX_email_login_link_hash', { unique: true })
    @Column({ type: 'varchar', length: 64, select: false })
    public tokenHash: string;

    @Index('IDX_email_login_link_expiry')
    @Column()
    public expiredAt: Date;

    @Column({ length: 2048 })
    public redirectPath: string;

    @Column({ type: 'varchar', length: 254, nullable: true, select: false })
    public registrationEmail: string | null;

    @Column({ type: 'varchar', length: 60, nullable: true, select: false })
    public registrationPasswordHash: string | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ foreignKeyConstraintName: 'FK_email_login_link_user' })
    public user: UserEntity;
}
