import { isLocalPath } from './local-path';

describe('local login destinations', () => {
    it.each(['/account/profile', '/account/orders/42', '/cart?source=email', '/'])('accepts %s', path => {
        expect(isLocalPath(path)).toBe(true);
    });
    it.each([null, undefined, 4, '', 'https://example.com', '//example.com', '/\\example.com', '/%2f%2fexample.com', '/x\ny', '/%0d%0aheader', '/%5cexample.com'])('rejects %p', path => {
        expect(isLocalPath(path)).toBe(false);
    });
});
