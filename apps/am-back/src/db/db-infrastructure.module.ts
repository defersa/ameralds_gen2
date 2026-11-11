import { DataSourceService } from "@am-back/db/data-source.service";
import { AuthEmailLimitService } from "@am-back/db/service/auth-email-limit.service";
import { AuthEmailService } from "@am-back/db/service/auth-email.service";
import { CommonEntitiesService } from "@am-back/db/service/common-entities.service";
import { EmailLoginService } from "@am-back/db/service/email-login.service";
import { FilesService } from "@am-back/db/service/files.service";
import { UserPatternService } from "@am-back/db/service/general/user-pattern.service";
import { ImagesService } from "@am-back/db/service/images.service";
import { CategoriesService } from "@am-back/db/service/patterns/categories.service";
import { PatternOrdersService } from "@am-back/db/service/patterns/pattern-orders.service";
import { PatternsSizeService } from "@am-back/db/service/patterns/pattern-sizes.service";
import { PatternsService } from "@am-back/db/service/patterns/patterns.service";
import { SizesService } from "@am-back/db/service/patterns/sizes.service";
import { TokenService } from "@am-back/db/service/token.service";
import { UserService } from "@am-back/db/service/user.service";
import { MailService } from "@am-back/mail/mail.service";
import { Module, type Provider } from "@nestjs/common";
import { PatternGrantsService } from './services/pattern-grants/pattern-grants.service';
import { PatternGrantRepository } from './services/pattern-grants/repositories/pattern-grant.repository';
import { UserPatternRepository } from './services/pattern-grants/repositories/user-pattern.repository';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordResetRepository } from './repositories/password-reset.repository';


const services: Provider[] = [
	DataSourceService,
	TokenService,
	UserService,
	ImagesService,
	CommonEntitiesService,
	CategoriesService,
	SizesService,
	PatternsSizeService,
	PatternsService,
	FilesService,
	PatternOrdersService,
	UserPatternService,
	PatternGrantsService,
	EmailLoginService,
	MailService,
	AuthEmailService,
	AuthEmailLimitService,
	PasswordResetService,
];

@Module({
	providers: [...services, PatternGrantRepository, UserPatternRepository, PasswordResetRepository],
	exports: services,
})
export class DbInfrastructureModule {}
