import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'users' })
export class AuthEmailLimitEntity {
    @PrimaryColumn({ type: 'varchar', length: 64, primaryKeyConstraintName: 'PK_auth_email_limit' })
    public key: string;

    @Column()
    public count: number;

    @Index('IDX_auth_email_limit_reset')
    @Column()
    public resetAt: Date;
}
