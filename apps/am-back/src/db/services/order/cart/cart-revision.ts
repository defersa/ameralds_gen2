import type { UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { createHash } from "node:crypto";


/**
 * Возвращает устойчивый отпечаток состава корзины без цен и времени чтения.
 * Позволяет обнаружить изменения в другой вкладке и потерю связей каталога после подтверждённого чтения.
 */
export function cartRevision(cart: Pick<UserOrderEntity, "id" | "patterns">): string {
	const selection = cart.patterns
		.map((item) => ({
			id: item.id,
			patternId: item.pattern?.id ?? null,
			state: item.state,
			sizes: (item.sizes ?? [])
				.map((size) => size.id)
				.sort((left, right) => left - right),
			color: item.color,
			requiresPatternPurchase: item.requiresPatternPurchase,
		}))
		.sort((left, right) => left.id - right.id);

	return createHash("sha256").update(JSON.stringify({
		id: cart.id,
		selection,
	})).digest("hex");
}
