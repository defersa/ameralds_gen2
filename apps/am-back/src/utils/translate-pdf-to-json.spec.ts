import { getDocument, type PDFDocumentLoadingTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { translatePdfToJson } from './translate-pdf-to-json';

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ getDocument: jest.fn() }));

const emptyMetadata = {
    name: null,
    author: null,
    circumference: null,
    repeatOfColors: null,
    rowsPerRepeat: null,
    totalRows: null,
    declaredTotalBeads: null,
};

function createTextItem(str: string, x: number, y: number) {
    return { str, transform: [1, 0, 0, 1, x, y] };
}

function createPage(items: (ReturnType<typeof createTextItem> | { type: string })[] = []) {
    return {
        getTextContent: jest.fn().mockResolvedValue({ items }),
        getOperatorList: jest.fn().mockResolvedValue({ fnArray: [], argsArray: [] }),
        cleanup: jest.fn(),
    };
}

function mockDocument(pages: ReturnType<typeof createPage>[]) {
    const pdf = {
        numPages: pages.length,
        getPage: jest.fn(async (number: number) => pages[number - 1]),
        getMetadata: jest.fn().mockResolvedValue({ info: {} }),
    };
    const task = {
        promise: Promise.resolve(pdf),
        destroy: jest.fn().mockResolvedValue(undefined),
    };
    jest.mocked(getDocument).mockReturnValue(task as unknown as PDFDocumentLoadingTask);
    return { pdf, task };
}

describe('translatePdfToJson', () => {
    beforeEach(() => jest.clearAllMocks());

    it('reads the Blob, skips cover groups and orders groups by page, column and descending Y', async () => {
        const cover = createPage([createTextItem('a 999', 50, 700)]);
        const second = createPage([
            createTextItem('c 3', 200, 700),
            createTextItem('b', 54, 650),
            createTextItem('12', 70, 651),
            createTextItem('  a   2  ', 50, 700),
            createTextItem(' ', 50, 750),
            createTextItem('ab 99', 200, 750),
            { type: 'beginMarkedContent' },
        ]);
        const third = createPage([createTextItem('b 4', 50, 700)]);
        const { pdf, task } = mockDocument([cover, second, third]);
        const blob = new Blob(['pdf bytes']);

        await expect(translatePdfToJson(blob)).resolves.toEqual({
            ...emptyMetadata,
            sequence: [
                { color: 'a', count: 2 },
                { color: 'b', count: 12 },
                { color: 'c', count: 3 },
                { color: 'b', count: 4 },
            ],
            totalBeads: 21,
        });
        expect(getDocument).toHaveBeenCalledWith({ data: new TextEncoder().encode('pdf bytes') });
        expect(pdf.getPage.mock.calls).toEqual([[1], [2], [3]]);
        expect(cover.getTextContent).toHaveBeenCalledTimes(1);
        expect(cover.cleanup).toHaveBeenCalledTimes(1);
        expect(second.cleanup).toHaveBeenCalledTimes(1);
        expect(third.cleanup).toHaveBeenCalledTimes(1);
        expect(task.destroy).toHaveBeenCalledTimes(1);
    });

    it.each(['combined', 'separate'])('recognizes a–z groups in %s text fragments', async (format) => {
        const sequence = [
            { color: 'a', count: 1 },
            { color: 'd', count: 4 },
            { color: 'm', count: 13 },
            { color: 'z', count: 26 },
        ];
        const items = sequence.flatMap(({ color, count }, index) => {
            const y = 700 - index * 50;
            return format === 'combined'
                ? [createTextItem(`${color} ${count}`, 50, y)]
                : [createTextItem(color, 50, y), createTextItem(String(count), 70, y)];
        });
        mockDocument([createPage(), createPage(items)]);

        await expect(translatePdfToJson(new Blob())).resolves.toEqual({
            ...emptyMetadata,
            sequence,
            totalBeads: 44,
        });
    });

    it('does not pair counts outside the row or horizontal distance tolerance', async () => {
        mockDocument([createPage(), createPage([
            createTextItem('a', 50, 700),
            createTextItem('10', 85, 700),
            createTextItem('b', 50, 650),
            createTextItem('20', 60, 647),
            createTextItem('c', 50, 600),
            createTextItem('30', 60, 600),
        ])]);

        await expect(translatePdfToJson(new Blob())).resolves.toEqual({
            ...emptyMetadata,
            sequence: [{ color: 'c', count: 30 }],
            totalBeads: 30,
        });
    });

    it('keeps columns separated when their X coordinates differ by ten', async () => {
        mockDocument([createPage(), createPage([
            createTextItem('b 2', 60, 700),
            createTextItem('a 1', 50, 650),
        ])]);

        await expect(translatePdfToJson(new Blob())).resolves.toEqual({
            ...emptyMetadata,
            sequence: [{ color: 'a', count: 1 }, { color: 'b', count: 2 }],
            totalBeads: 3,
        });
    });

    it('returns an empty result for a document containing only a cover', async () => {
        const { task } = mockDocument([createPage()]);

        await expect(translatePdfToJson(new Blob())).resolves.toEqual({
            ...emptyMetadata,
            sequence: [], totalBeads: 0,
        });
        expect(task.destroy).toHaveBeenCalledTimes(1);
    });

    it('returns an empty sequence when pages have no matching groups', async () => {
        mockDocument([createPage(), createPage()]);

        await expect(translatePdfToJson(new Blob())).resolves.toEqual({
            ...emptyMetadata,
            sequence: [],
            totalBeads: 0,
        });
    });

    it('reads cover metadata and keeps the declared bead count separate from the sequence total', async () => {
        const cover = createPage([
            createTextItem('Name: Эльза', 50, 750),
            createTextItem('Author', 50, 730),
            createTextItem('Amerald', 250, 730),
            createTextItem('Circumference 19', 50, 710),
            createTextItem('Repeat of colors 1265', 50, 690),
            createTextItem('Rows per repeat 66 и 11 бисерин', 50, 670),
            createTextItem('Total number of rows 67', 50, 650),
            createTextItem('Total number of beads 1273', 50, 630),
        ]);
        const { pdf } = mockDocument([cover, createPage([createTextItem('z 2', 50, 700)])]);
        pdf.getMetadata.mockResolvedValue({ info: { Title: 'export.pdf', Author: 'Generator' } });

        await expect(translatePdfToJson(new Blob())).resolves.toEqual({
            name: 'Эльза',
            author: 'Amerald',
            circumference: 19,
            repeatOfColors: 1265,
            rowsPerRepeat: '66 и 11 бисерин',
            totalRows: 67,
            declaredTotalBeads: 1273,
            sequence: [{ color: 'z', count: 2 }],
            totalBeads: 2,
        });
        expect(cover.getOperatorList).not.toHaveBeenCalled();
    });

    it('uses embedded PDF title and author when the pattern table omits them', async () => {
        const { pdf } = mockDocument([createPage()]);
        pdf.getMetadata.mockResolvedValue({ info: { Title: '  Эльза  ', Author: ' Amerald ' } });

        await expect(translatePdfToJson(new Blob())).resolves.toEqual({
            ...emptyMetadata,
            name: 'Эльза',
            author: 'Amerald',
            sequence: [], totalBeads: 0,
        });
    });

    it('destroys the loading task and propagates a PDF loading error', async () => {
        const { task } = mockDocument([]);
        const error = new Error('Invalid PDF');
        task.promise = Promise.reject(error);

        await expect(translatePdfToJson(new Blob())).rejects.toBe(error);
        expect(task.destroy).toHaveBeenCalledTimes(1);
    });

    it('cleans up the page and document when text extraction fails', async () => {
        const page = createPage();
        const error = new Error('Cannot extract text');
        page.getTextContent.mockRejectedValue(error);
        const { task } = mockDocument([createPage(), page]);

        await expect(translatePdfToJson(new Blob())).rejects.toBe(error);
        expect(page.cleanup).toHaveBeenCalledTimes(1);
        expect(task.destroy).toHaveBeenCalledTimes(1);
    });
});
