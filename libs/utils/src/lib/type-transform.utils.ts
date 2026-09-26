export function toArray<T>(values: T | T[]): T[] {
    return Array.isArray(values) ? values : [values];
}

export function toNumberArray(values: unknown): number[] {
    if (!values) {
        return [];
    }

    const rawValues: unknown[] = Array.isArray(values) ? values : [values];

    return rawValues
        .flatMap((value: unknown) => String(value).split(','))
        .map((value: string) => Number(value))
        .filter((value: number) => Number.isFinite(value));
}

export function toString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}
