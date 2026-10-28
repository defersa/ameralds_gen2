import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AuthEmailRequestKind {
    LOGIN = 'login',
    REGISTRATION = 'registration',
}

@Entity({ schema: 'users' })
@Index('IDX_auth_email_request_ready', ['availableAt', 'id'])
@Check('CHK_auth_email_request_kind', `"kind" IN ('login', 'registration')`)
export class AuthEmailRequestEntity {
    @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_auth_email_request' })
    public id: number;

    @CreateDateColumn()
    public createdAt: Date;

    @Column({ type: 'varchar', length: 16 })
    public kind: AuthEmailRequestKind;

    @Column({ length: 254 })
    public email: string;

    @Column({ type: 'varchar', length: 60, nullable: true, select: false })
    public passwordHash: string | null;

    @Column({ length: 2048 })
    public redirectPath: string;

    @Column({ default: 0 })
    public attempts: number;

    @Column()
    public availableAt: Date;

    @Column({ type: 'varchar', length: 36, nullable: true })
    public leaseToken: string | null;
}
