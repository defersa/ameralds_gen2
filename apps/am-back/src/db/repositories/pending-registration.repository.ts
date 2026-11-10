import { Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { ModelState } from '../abstract/abstract.model';
import { DataSourceService } from '../data-source.service';
import { EmailLoginLinkEntity } from '../entities/tokens/email-login-link.entity';


@Injectable()
export class PendingRegistrationRepository {
    /** Подключает хранилище ещё не погашенных ссылок регистрации. */
    constructor(private readonly dataSource: DataSourceService) {}

    /**
     * Проверяет наличие действующей ссылки регистрации для почты без чтения или сравнения пароля.
     * Использованные и истёкшие ссылки, а также ссылки входа существующих аккаунтов не учитываются.
     */
    public hasActiveLinkForEmail(email: string): Promise<boolean> {
        // Ищем только активное неподтверждённое приглашение с ещё не истёкшим сроком действия.
        return this.dataSource.getRepository(EmailLoginLinkEntity).existsBy({
            registrationEmail: email.trim().toLowerCase(),
            state: ModelState.ACTIVE,
            expiredAt: MoreThan(new Date()),
        });
    }
}
