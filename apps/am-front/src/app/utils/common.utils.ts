export function parseJsonWithDefault<T>(value, defaultValue: T): T {
    try {
        return JSON.parse(value) ?? defaultValue;
    } catch (e) {
        return defaultValue;
    }
}
