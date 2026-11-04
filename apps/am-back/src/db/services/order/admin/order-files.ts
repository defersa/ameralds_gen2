import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { ModelState } from "@am-back/db/abstract/abstract.model";
import type { PrivateFileEntity } from "@am-back/db/entities/files/file.entity";
import type { AdminOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { HttpException, HttpStatus } from "@nestjs/common";


/**
 * Возвращает уникальные активные CBB/PDF из активных позиций и размеров завершённого заказа; отсутствующий
 * или незавершённый заказ отклоняет стандартной ошибкой.
 */
export function getAdminOrderFiles(order: AdminOrderEntity): PrivateFileEntity[] {
	if (!order || order.state !== ModelState.ACTIVE) {
		throw new HttpException(
			{
				code: ApiErrorCodes.NOT_EXIST,
				entity: ApiEntityNames.CART,
			},
			HttpStatus.BAD_REQUEST,
		);
	}

	if (!order.isComplete) {
		throw new HttpException(
			{
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.CART,
			},
			HttpStatus.BAD_REQUEST,
		);
	}

	const files = (order.patterns ?? [])
		.filter((item) => item.state === ModelState.ACTIVE)
		.flatMap((item) => item.sizes ?? [])
		.filter((size) => size.state === ModelState.ACTIVE)
		.flatMap((size) => [size.cbb, size.pdf])
		.filter((file) => file?.state === ModelState.ACTIVE);

	return [...new Map(files
		.map((file) => [file.id, file]))
		.values()];
}
