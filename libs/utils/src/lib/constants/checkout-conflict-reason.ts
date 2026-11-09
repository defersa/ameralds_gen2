/** Причины отклонения checkout, требующие явного подтверждения исправленной корзины. */
export enum CheckoutConflictReason {
	PATTERN_UNAVAILABLE = "pattern_unavailable",
	SIZE_UNAVAILABLE = "size_unavailable",
	COLOR_UNAVAILABLE = "color_unavailable",
	SIZE_OWNED = "size_owned",
	COLOR_OWNED = "color_owned",
	SELECTION_CHANGED = "selection_changed",
}
