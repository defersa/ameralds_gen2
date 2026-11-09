import { HttpErrorResponse } from '@angular/common/http';
import { EnumCheckoutConflictReason } from '@am-front/root/api-v2';


const REASONS = new Map<string, string>(Object.entries({
    [EnumCheckoutConflictReason.PatternUnavailable]: 'схема недоступна',
    [EnumCheckoutConflictReason.SizeUnavailable]: 'размер недоступен',
    [EnumCheckoutConflictReason.ColorUnavailable]: 'подбор цвета недоступен',
    [EnumCheckoutConflictReason.SizeOwned]: 'размер уже куплен',
    [EnumCheckoutConflictReason.ColorOwned]: 'цвет уже куплен',
    [EnumCheckoutConflictReason.SelectionChanged]: 'состав изменился',
} satisfies Record<EnumCheckoutConflictReason, string>));

/** Читает только пригодные для показа данные структурированного конфликта; технические ошибки не отображает. */
export function conflictLabels(error: Error | null): string[] {
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
        return [];
    }

    const body: unknown = error.error;

    if (!body || typeof body !== 'object' || !('items' in body) || !Array.isArray(body.items)) {
        return [];
    }

    return body.items
        .flatMap((item: unknown) => {
            if (!item || typeof item !== 'object') {
                return [];
            }

            const name = 'name' in item && typeof item.name === 'string' ? item.name : 'Позиция корзины';

            const reasons = 'reasons' in item && Array.isArray(item.reasons) ? item.reasons
                .filter((reason: unknown): reason is string => typeof reason === 'string')
                .map((reason) => REASONS.get(reason) ?? 'выбор требует проверки') : [];

            return [`${name}: ${reasons.join(', ')}`];
        });
}
