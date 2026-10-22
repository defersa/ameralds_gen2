export function isStrongPassword(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 8 && value.length <= 72 &&
        new TextEncoder().encode(value).byteLength <= 72 &&
        /[0-9]/.test(value) && /[a-z]/.test(value) && /[A-Z]/.test(value);
}
