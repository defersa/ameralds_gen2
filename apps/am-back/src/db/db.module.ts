import { Module } from "@nestjs/common";
import { process } from "@am-back/core/declare/process";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenAccessEntity } from './entities/tokens/token-access.entity';
import { TokenEntity } from './entities/tokens/token.entity';
import { TokenRefreshEntity } from './entities/tokens/token-refresh.entity';
import { ImageEntity } from './entities/image/image.entity';
import { UserEntity } from './entities/user.entity';
import { CategoryEntity } from './entities/patterns/category.entity';
import { LabelLangEntity } from './entities/common/label-lang.entity';
import { NumberLangEntity } from './entities/common/number-lang.entity';
import { TextLangEntity } from './entities/common/text-lang.entity';
import { SizeEntity } from './entities/patterns/size.entity';
import { FileEntity, PrivateFileEntity, PublicFileEntity } from './entities/files/file.entity';
import { PatternEntity } from './entities/patterns/pattern.entity';
import { PatternSizeEntity } from './entities/patterns/pattern-size.entity';
import { OrderPatternEntity, UserPatternEntity } from './entities/patterns/pattern-order.entity';
import { AdminOrderEntity, UserOrderEntity } from './entities/purchases/order.entity';
import { UserPaymentEntity } from './entities/purchases/payment.entity';
import { UserPatternGrantEntity } from './entities/patterns/user-pattern-grant.entity';
import { PaymentRequestEntity } from './entities/purchases/payment-request.entity';
import { EmailLoginLinkEntity } from './entities/tokens/email-login-link.entity';
import { AuthEmailRequestEntity } from './entities/tokens/auth-email-request.entity';
import { AuthEmailLimitEntity } from './entities/tokens/auth-email-limit.entity';
import { AppSettingEntity } from './entities/app-setting.entity';
import { PasswordResetLinkEntity } from './entities/tokens/password-reset-link.entity';
import { PaymentEffectEntity } from './entities/purchases/payment-effect.entity';


@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            autoLoadEntities: true,
            entities: [
                AppSettingEntity,
                TokenAccessEntity,
                TokenEntity,
                TokenRefreshEntity,
                EmailLoginLinkEntity,
                PasswordResetLinkEntity,
                AuthEmailRequestEntity,
                AuthEmailLimitEntity,
                ImageEntity,
                UserEntity,
                CategoryEntity,
                LabelLangEntity,
                NumberLangEntity,
                TextLangEntity,
                SizeEntity,
                FileEntity,
                PublicFileEntity,
                PrivateFileEntity,
                PatternEntity,
                PatternSizeEntity,

                OrderPatternEntity,
                UserPatternEntity,
                UserPatternGrantEntity,

                AdminOrderEntity,
                UserOrderEntity,
                UserPaymentEntity,
                PaymentRequestEntity,
                PaymentEffectEntity,
            ],
            // logging: true,
        }),
    ],
})
export class DbModule {
}
