import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker, type Worker } from 'tesseract.js';
import { parsePdfPatternMetadata, readPdfPageMetadata } from './pdf-pattern-metadata';

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
    OPS: { paintImageXObject: 85, paintInlineImageXObject: 86 },
    ImageKind: { GRAYSCALE_1BPP: 1, RGB_24BPP: 2, RGBA_32BPP: 3 },
}));
jest.mock('tesseract.js', () => ({
    createWorker: jest.fn(),
    OEM: { LSTM_ONLY: 1 },
    PSM: { SINGLE_BLOCK: '6' },
}));

const lines = [
    'Name       Эльза',
    'Author     Amerald',
    'Circumference 19',
    'Repeat of colors 1265',
    'Rows per repeat 66 и 11 бисерин',
    'Total number of rows 67',
    'Total number of beads 1273',
];
const expected = {
    name: 'Эльза',
    author: 'Amerald',
    circumference: 19,
    repeatOfColors: 1265,
    rowsPerRepeat: '66 и 11 бисерин',
    totalRows: 67,
    declaredTotalBeads: 1273,
};
const emptyMetadata = {
    name: null, author: null, circumference: null, repeatOfColors: null,
    rowsPerRepeat: null, totalRows: null, declaredTotalBeads: null,
};

function mockImagePage(width = 100, height = 30) {
    const image = { width, height, kind: 2, data: new Uint8Array(width * height * 3).fill(255) };
    return {
        getOperatorList: jest.fn().mockResolvedValue({
            fnArray: [85, 85],
            argsArray: [['image', width, height], ['image', width, height]],
        }),
        objs: { get: jest.fn((_id, resolve) => resolve(image)) },
    };
}

describe('PDF pattern metadata', () => {
    beforeEach(() => jest.clearAllMocks());

    it('parses the metadata table and preserves the rows per repeat text', () => {
        expect(parsePdfPatternMetadata(lines)).toEqual(expected);
    });

    it('accepts Russian labels, separate value lines, colons and grouped numbers', () => {
        expect(parsePdfPatternMetadata([
            'Название схемы:', 'Эльза',
            'Автор: Amerald',
            'Окружность: 19',
            'Раппорт цветов: 1 265',
            'Рядов в раппорте: 66 и 11 бисерин',
            'Общее количество рядов: 67',
            'Всего бисерин: 1\u00a0273',
        ])).toEqual(expected);
    });

    it('parses Russian quantity labels and OCR separators from Charodeyka', () => {
        expect(parsePdfPatternMetadata([
            'Название                                Чароддейка',
            'Автор                                    Amerald',
            'Количество бисерин в ряду        21',
            'Количество бисерин в повторе | 3066',
            'Количество рядов в повторе       146',
            'Количество рядов                     146',
            'Количество бисерин                    3066',
        ])).toEqual({
            name: 'Чароддейка',
            author: 'Amerald',
            circumference: 21,
            repeatOfColors: 3066,
            rowsPerRepeat: '146',
            totalRows: 146,
            declaredTotalBeads: 3066,
        });
    });

    it('ignores table borders and accepts values on separate lines', () => {
        expect(parsePdfPatternMetadata([
            '| Name |', '| Эльза |',
            '| Author | Amerald |',
            '| Circumference | 19 |',
            '| Repeat of colors | 1 265 |',
            '| Rows per repeat | 66 и 11 бисерин |',
            '| Total number of rows | 67 |',
            '| Total number of beads | 1\u00a0273 |',
        ])).toEqual(expected);
    });

    it('does not read a following Russian quantity label as a missing value', () => {
        expect(parsePdfPatternMetadata([
            'Количество бисерин в ряду |',
            'Количество бисерин в повторе | 3066',
            'Количество рядов в повторе |',
            'Количество рядов | 146',
            'Количество бисерин | 3066',
        ])).toEqual({
            ...emptyMetadata,
            repeatOfColors: 3066,
            totalRows: 146,
            declaredTotalBeads: 3066,
        });
    });

    it.each(['-19', '12x3', '1.5', '12|34', '9007199254740992'])(
        'rejects the invalid count %s surrounded by table borders', (value) => {
            expect(parsePdfPatternMetadata([`Circumference | ${value} |`]))
                .toEqual(emptyMetadata);
        },
    );

    it('leaves missing and malformed fields null and ignores group and page labels', () => {
        expect(parsePdfPatternMetadata([
            'Name', 'Author: Amerald',
            'Circumference -19',
            'Repeat of colors 12x3',
            'Total number of rows 1.5',
            'Total number of beads 9007199254740992',
            'a 2', 'Page 1',
        ])).toEqual({ ...emptyMetadata, author: 'Amerald' });
    });

    it('skips OCR when all fields are present in the text layer', async () => {
        const page = mockImagePage();
        await expect(readPdfPageMetadata(page as unknown as PDFPageProxy, lines, emptyMetadata))
            .resolves.toEqual(expected);
        expect(page.getOperatorList).not.toHaveBeenCalled();
        expect(createWorker).not.toHaveBeenCalled();
    });

    it('reads image tables locally, deduplicates images and cleans up the worker and models', async () => {
        const page = mockImagePage();
        const worker = {
            setParameters: jest.fn().mockResolvedValue(undefined),
            recognize: jest.fn().mockResolvedValue({ data: { text: 'Name Эльза' } }),
            terminate: jest.fn().mockResolvedValue(undefined),
        };
        jest.mocked(createWorker).mockImplementation(async (_languages, _mode, options) => {
            await access(join(options.langPath, 'eng.traineddata.gz'));
            await access(join(options.langPath, 'rus.traineddata.gz'));
            return worker as unknown as Worker;
        });

        await expect(readPdfPageMetadata(page as unknown as PDFPageProxy, [], emptyMetadata))
            .resolves.toEqual({ ...emptyMetadata, name: 'Эльза' });
        expect(createWorker).toHaveBeenCalledTimes(1);
        expect(worker.recognize).toHaveBeenCalledWith(expect.any(Buffer));
        expect(worker.terminate).toHaveBeenCalledTimes(1);
        const options = jest.mocked(createWorker).mock.calls[0][2];
        expect(options.cacheMethod).toBe('none');
        await expect(access(options.langPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('preserves text metadata and fills the remaining fields from OCR', async () => {
        const page = mockImagePage();
        const worker = {
            setParameters: jest.fn().mockResolvedValue(undefined),
            recognize: jest.fn().mockResolvedValue({ data: { text: lines.join('\n') } }),
            terminate: jest.fn().mockResolvedValue(undefined),
        };
        jest.mocked(createWorker).mockResolvedValue(worker as unknown as Worker);

        await expect(readPdfPageMetadata(page as unknown as PDFPageProxy, ['Name Another pattern'], emptyMetadata))
            .resolves.toEqual({ ...expected, name: 'Another pattern' });
        expect(worker.recognize).toHaveBeenCalledTimes(1);
    });

    it('does not send the tall weaving chart to OCR', async () => {
        const page = mockImagePage(100, 200);
        await expect(readPdfPageMetadata(page as unknown as PDFPageProxy, [], emptyMetadata))
            .resolves.toEqual(emptyMetadata);
        expect(page.objs.get).not.toHaveBeenCalled();
        expect(createWorker).not.toHaveBeenCalled();
    });

    it('cleans up temporary files and the worker when recognition fails', async () => {
        const page = mockImagePage();
        const error = new Error('OCR failed');
        const worker = {
            setParameters: jest.fn().mockResolvedValue(undefined),
            recognize: jest.fn().mockRejectedValue(error),
            terminate: jest.fn().mockResolvedValue(undefined),
        };
        jest.mocked(createWorker).mockResolvedValue(worker as unknown as Worker);

        await expect(readPdfPageMetadata(page as unknown as PDFPageProxy, [], emptyMetadata)).rejects.toBe(error);
        expect(worker.terminate).toHaveBeenCalledTimes(1);
        const options = jest.mocked(createWorker).mock.calls[0][2];
        await expect(access(options.langPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
