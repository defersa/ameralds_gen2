import { isStrongPassword } from './password';

describe('registration password policy', () => {
    it.each([null, undefined, 123, '', 'Ab1', 'abcdefgh1', 'ABCDEFGH1', 'Abcdefgh', 'Aa1' + 'x'.repeat(70)])('rejects %p', value => {
        expect(isStrongPassword(value)).toBe(false);
    });

    it('accepts repeated checks and passwords with spaces and Unicode', () => {
        for (let index = 0; index < 3; index++) {
            expect(isStrongPassword('Abcd 123 пароль')).toBe(true);
        }
    });

    it('enforces the bcrypt boundary in UTF-8 bytes', () => {
        expect(isStrongPassword('Aa1!' + 'я'.repeat(34))).toBe(true);
        expect(isStrongPassword('Aa1!' + 'я'.repeat(35))).toBe(false);
    });
});
