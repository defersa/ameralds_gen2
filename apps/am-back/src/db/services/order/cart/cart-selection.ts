import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import type { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import type { InputShortOrderPatternDto } from "@am-back/modules/orders/dto/orders.dto";
import { BadRequestException } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import type { OrderPatternRepository } from "../repositories/order-pattern.repository";
import type { OrderPatternOwner } from "../types/order-pattern-owner";


/**
 * Нормализует непустой выбор схемы и размеров, устанавливая покупку схемы; для неполного выбора возвращает
 * null.
 */
export function prepareCartPattern(item: InputShortOrderPatternDto): InputShortOrderPatternDto | null {
	return item.pattern && item.sizes?.length > 0
		? {
			pattern: item.pattern,
			requiresPatternPurchase: true,
			color: item.color,
			sizes: item.sizes,
		}
		: null;
}

/**
 * В переданной транзакции загружает активную схему и её выбранные размеры и сохраняет позицию указанного
 * владельца; отсутствие схемы возвращает NOT_EXIST.
 */
export async function selectOrderPattern(
	items: OrderPatternRepository,
	input: InputShortOrderPatternDto,
	owner: OrderPatternOwner,
	manager: EntityManager,
): Promise<OrderPatternEntity> {
	const pattern = await items.findSelectedPattern(input.pattern, manager);

	if (!pattern) {
		throw new BadRequestException({
			code: ApiErrorCodes.NOT_EXIST,
			entity: ApiEntityNames.PATTERN,
		});
	}

	const sizes = await items.findSelectedSizes(input.pattern, input.sizes, manager);

	return items.insertSelection(input, owner, pattern, sizes, manager);
}
