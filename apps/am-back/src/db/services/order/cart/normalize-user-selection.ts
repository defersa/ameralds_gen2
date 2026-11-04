import type { OwnedPatternSelection } from "@am-back/db/service/general/pattern-purchase";
import type { InputShortOrderPatternDto } from "@am-back/modules/orders/dto/orders.dto";


/**
 * Исключает действующие права из выбора схемы. Цвет един для всех размеров и доступен отдельно
 * только владельцу хотя бы одного размера. При отсутствии нового права возвращает null.
 */
export function normalizeUserSelection(
	input: InputShortOrderPatternDto,
	bought: OwnedPatternSelection[],
): InputShortOrderPatternDto | null {
	const owned = bought
		.filter((item) => item.patternId === input.pattern);

	const ownedSizes = new Set(owned
		.flatMap((item) => item.sizeIds));

	const sizes = [...new Set(input.sizes ?? [])]
		.filter((id) => !ownedSizes.has(id));

	const color = Boolean(input.color) && !owned
		.some((item) => item.color) && (ownedSizes.size > 0 || sizes.length > 0);

	if (!input.pattern || (!sizes.length && !color)) {
		return null;
	}

	return {
		pattern: input.pattern,
		sizes,
		color,
		requiresPatternPurchase: ownedSizes.size === 0 && sizes.length > 0,
	};
}
