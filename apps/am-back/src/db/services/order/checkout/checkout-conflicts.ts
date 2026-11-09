import { CheckoutConflictReason } from "@ameralds/utils";
import { ModelState } from "@am-back/db/abstract/abstract.model";
import type { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import type { OwnedPatternSelection } from "@am-back/db/service/general/pattern-purchase";
import type { CheckoutConflictItemDto } from "@am-back/modules/orders/dto/checkout.dto";
import { normalizeUserSelection } from "../cart/normalize-user-selection";


/**
 * Сверяет выбранные позиции с каталогом и действующими правами без изменения корзины.
 * Возвращает конфликтующие позиции с причинами, чтобы пользователь подтвердил исправление отдельно.
 */
export function checkoutConflicts(items: OrderPatternEntity[], bought: OwnedPatternSelection[]): CheckoutConflictItemDto[] {
	const conflicts: CheckoutConflictItemDto[] = [];
	const seen = new Set<number>();

	for (const item of items) {
		const reasons = new Set<CheckoutConflictReason>();
		const pattern = item.pattern;

		const sizeIds = (item.sizes ?? [])
			.flatMap((size) => size.size ? [size.size.id] : []);

		const isPatternUnavailable = !pattern || pattern.state !== ModelState.ACTIVE || pattern.hidden || item.state !== ModelState.ACTIVE;

		if (isPatternUnavailable) {
			reasons.add(CheckoutConflictReason.PATTERN_UNAVAILABLE);
		}

		const hasUnavailableSize = (item.sizes ?? [])
			.some((size) => size.state !== ModelState.ACTIVE || size.size?.state !== ModelState.ACTIVE || size.pattern?.id !== pattern?.id);

		if (hasUnavailableSize) {
			reasons.add(CheckoutConflictReason.SIZE_UNAVAILABLE);
		}

		const isColorUnavailable = item.color && pattern?.color?.state !== ModelState.ACTIVE;

		if (isColorUnavailable) {
			reasons.add(CheckoutConflictReason.COLOR_UNAVAILABLE);
		}

		const owned = bought
			.filter((selection) => selection.patternId === pattern?.id);

		const hasOwnedSize = owned
			.some((selection) => selection.sizeIds
				.some((id) => sizeIds
					.includes(id)));

		if (hasOwnedSize) {
			reasons.add(CheckoutConflictReason.SIZE_OWNED);
		}

		const isColorOwned = item.color && owned
			.some((selection) => selection.color);

		if (isColorOwned) {
			reasons.add(CheckoutConflictReason.COLOR_OWNED);
		}

		const hasPattern = !!pattern;

		if (hasPattern) {
			const normalized = normalizeUserSelection({
				pattern: pattern.id,
				sizes: sizeIds,
				color: item.color,
				requiresPatternPurchase: item.requiresPatternPurchase,
			}, bought);

			const hasSelectionChanged = !normalized || normalized.requiresPatternPurchase !== item.requiresPatternPurchase ||
				normalized.sizes.length !== sizeIds.length || seen.has(pattern.id);

			if (hasSelectionChanged) {
				reasons.add(CheckoutConflictReason.SELECTION_CHANGED);
			}

			seen.add(pattern.id);
		}

		const hasConflicts = reasons.size > 0;

		if (hasConflicts) {
			conflicts
				.push({
				itemId: item.id,
				patternId: pattern?.id ?? null,
				name: pattern?.name?.ru ?? null,
				sizeIds,
				color: item.color,
				reasons: [...reasons],
			});
		}
	}

	return conflicts;
}
