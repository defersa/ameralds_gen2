import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { CommonEntitiesService } from "@am-back/db/service/common-entities.service";
import { PatternsSizeService } from "@am-back/db/service/patterns/pattern-sizes.service";
import { PatternsService } from "@am-back/db/service/patterns/patterns.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InputShortOrderPatternDto } from "../../../modules/orders/dto/orders.dto";
import { DataSourceService } from "../../data-source.service";
import { OrderPatternEntity, UserPatternEntity } from "../../entities/patterns/pattern-order.entity";
import { PatternSizeEntity } from "../../entities/patterns/pattern-size.entity";
import { PatternEntity } from "../../entities/patterns/pattern.entity";
import { OrderStatus, UserOrderEntity, type AdminOrderEntity } from "../../entities/purchases/order.entity";


interface OrderPatternOwner {
	order?: UserOrderEntity;
	adminOrder?: AdminOrderEntity;
}

@Injectable()
export class PatternOrdersService {
	private userPatternRepository: Repository<UserPatternEntity>;
	private orderPatternRepository: Repository<OrderPatternEntity>;

	/** Подключает репозитории покупок и позиций заказа, а также сервисы схем, размеров и общих сущностей. */
	constructor(
		private dataSource: DataSourceService,
		private commonEntitiesService: CommonEntitiesService,
		private patternsService: PatternsService,
		private patternSizeService: PatternsSizeService,
	) {
		this.userPatternRepository = this.dataSource.getRepository<UserPatternEntity>(UserPatternEntity);
		this.orderPatternRepository = this.dataSource.getRepository<OrderPatternEntity>(OrderPatternEntity);
	}

	/**
	 * Создаёт позицию заказа из схемы и выбранных размеров; при привязке к пользовательскому заказу требует
	 * статус OPEN.
	 */
	public async createOrderPattern(
		order: InputShortOrderPatternDto,
		owner: OrderPatternOwner = {},
	): Promise<OrderPatternEntity> {
		if (owner.order) {
			await this.assertOpenOrder(owner.order.id);
		}

		const pattern: PatternEntity = await this.patternsService.getPattern(order.pattern);
		const sizes: PatternSizeEntity[] = await this.patternSizeService.getPatternSizes(order.pattern, order.sizes);

		const orderEntity: OrderPatternEntity = this.orderPatternRepository.create({
			pattern,
			sizes,
			requiresPatternPurchase: order.requiresPatternPurchase,
			color: order.color,
			...owner,
		});

		await this.orderPatternRepository.save(orderEntity);

		return orderEntity;
	}

	/** Удаляет позицию; для позиции пользовательского заказа предварительно проверяет, что заказ ещё открыт. */
	public async removeOrderPatter(order: OrderPatternEntity): Promise<void> {
		const stored = await this.orderPatternRepository.findOne({
			where: {
				id: order.id,
			},
			relations: { order: true },
		});

		if (stored?.order) {
			await this.assertOpenOrder(stored.order.id);
		}

		await this.orderPatternRepository.remove(order);
	}

	/** Проверяет существование заказа и статус OPEN; при нарушении возвращает INVALID для корзины. */
	private async assertOpenOrder(id: number): Promise<void> {
		const order = await this.dataSource.getRepository(UserOrderEntity).findOneBy({ id });

		if (!order || order.status !== OrderStatus.OPEN) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.CART,
			});
		}
	}
}
