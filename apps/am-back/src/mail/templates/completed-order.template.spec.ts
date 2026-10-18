import { CompletedOrderMailData, renderCompletedOrderMail } from './completed-order.template';


describe('renderCompletedOrderMail', () => {
    const data: CompletedOrderMailData = {
        id: 42,
        email: 'buyer@example.com',
        vk: 'https://vk.ru/buyer',
        completedAt: new Date(2026, 9, 16),
        items: [{
            name: 'Волны',
            categories: ['Радуга', 'Серый'],
            sizes: [31, 33],
            color: true,
            price: 500,
            imageCid: 'order-42-item-0@ameralds',
        }],
        total: 500,
    };

    it('includes matching order details in HTML and plain text', () => {
        const template = renderCompletedOrderMail(data);

        expect(template.subject).toBe('Заказ №42 оформлен');
        expect(template.html).toContain('cid:amstore-logo@ameralds');
        expect(template.html).toContain('cid:order-42-item-0@ameralds');
        for (const content of [template.html, template.text]) {
            expect(content).toContain('Волны');
            expect(content).toContain('buyer@example.com');
            expect(content).toContain('https://vk.ru/buyer');
            expect(content).toContain('16 октября 2026');
            expect(content).toMatch(/500\s₽/);
        }
        expect(template.text).not.toContain('<table');
    });

    it('escapes dynamic text in content and image attributes', () => {
        const template = renderCompletedOrderMail({
            ...data,
            email: '"<buyer>&@example.com',
            vk: '<script>bad</script>',
            items: [{ ...data.items[0], name: '<img src=x onerror="bad()">', categories: ['<b>Категория</b>'] }],
        });

        expect(template.html).not.toContain('<script>bad');
        expect(template.html).not.toContain('<img src=x');
        expect(template.html).toContain('&lt;img src=x onerror=&quot;bad()&quot;&gt;');
        expect(template.html).toContain('&lt;b&gt;Категория&lt;/b&gt;');
        expect(template.html).toContain('&quot;&lt;buyer&gt;&amp;@example.com');
    });

    it('renders an empty order without broken image references', () => {
        const template = renderCompletedOrderMail({ ...data, items: [], total: 0, vk: undefined, completedAt: undefined });

        expect(template.html).toContain('В заказе нет схем.');
        expect(template.text).toContain('В заказе нет схем.');
        expect(template.html).not.toContain('cid:order-42');
        expect(template.text).not.toContain('VK:');
    });
});
