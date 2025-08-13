export function parseJsonWithDefault<T>(value, defaultValue: T): T {
    try {
        return JSON.parse(value);
    } catch (e) {
        return defaultValue;
    }
}
