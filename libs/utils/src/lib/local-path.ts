/** Разрешает переходы внутри сайта, исключая внешние URL и неоднозначные разделители. */
export function isLocalPath(value: unknown): value is string {
    return typeof value === 'string' && value.length <= 2048 &&
        value.startsWith('/') && !value.startsWith('//') &&
        !value.includes('\\') && !Array.from(value).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127) &&
        !/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value);
}
