export function getArrayFromEnum<T>(object: Record<string, T>): T[] {
    return Object.values(object)
        .filter((item: T) => typeof item !== 'string');
}
