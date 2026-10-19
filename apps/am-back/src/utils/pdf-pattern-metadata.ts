import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ImageKind, OPS, type PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import type { Worker } from 'tesseract.js';

export interface PdfPatternMetadata {
    name: string | null;
    author: string | null;
    circumference: number | null;
    repeatOfColors: number | null;
    rowsPerRepeat: string | null;
    totalRows: number | null;
    declaredTotalBeads: number | null;
}

const fields: { key: keyof PdfPatternMetadata; label: RegExp }[] = [
    { key: 'name', label: /^(?:Name|Title|Название(?: схемы)?)(?:\s*[:=]\s*|\s+|$)(.*)$/iu },
    { key: 'author', label: /^(?:Author|Автор)(?:\s*[:=]\s*|\s+|$)(.*)$/iu },
    { key: 'circumference', label: /^(?:Circumference|Окружность|Количество бисерин в ряду)(?:\s*[:=]\s*|\s+|$)(.*)$/iu },
    { key: 'repeatOfColors', label: /^(?:Repeat of colors|Раппорт цветов|Количество бисерин в повторе)(?:\s*[:=]\s*|\s+|$)(.*)$/iu },
    { key: 'rowsPerRepeat', label: /^(?:Rows per repeat|Рядов в раппорте|Количество рядов в повторе)(?:\s*[:=]\s*|\s+|$)(.*)$/iu },
    { key: 'totalRows', label: /^(?:Total number of rows|Всего рядов|Общее (?:число|количество) рядов|Количество рядов)(?:\s*[:=]\s*|\s+|$)(.*)$/iu },
    { key: 'declaredTotalBeads', label: /^(?:Total number of beads|Всего бисерин|Общее (?:число|количество) бисерин|Количество бисерин)(?:\s*[:=]\s*|\s+|$)(.*)$/iu },
];

function trimTableCell(value: string): string {
    // OCR может принять границы ячейки за вертикальные черты.
    return value.replace(/^[\s|]+|[\s|]+$/g, '');
}

function parseCount(value: string | undefined): number | null {
    if (!value || !/^\d[\d\s]*$/.test(value)) return null;
    const count = Number(value.replace(/\s/g, ''));
    return Number.isSafeInteger(count) ? count : null;
}

export function parsePdfPatternMetadata(lines: string[]): PdfPatternMetadata {
    const values: Partial<Record<keyof PdfPatternMetadata, string>> = {};
    const normalized = lines.map((line) => trimTableCell(line.replace(/\s+/g, ' '))).filter(Boolean);

    for (let index = 0; index < normalized.length; index++) {
        for (const { key, label } of fields) {
            const match = normalized[index].match(label);
            if (!match) continue;

            const next = normalized[index + 1];
            const value = trimTableCell(match[1]) || (
                next && !fields.some((field) => field.label.test(next)) ? next : ''
            );
            if (value && !values[key]) values[key] = value;
            break;
        }
    }

    return {
        name: values.name ?? null,
        author: values.author ?? null,
        circumference: parseCount(values.circumference),
        repeatOfColors: parseCount(values.repeatOfColors),
        rowsPerRepeat: values.rowsPerRepeat ?? null,
        totalRows: parseCount(values.totalRows),
        declaredTotalBeads: parseCount(values.declaredTotalBeads),
    };
}

function mergeMetadata(current: PdfPatternMetadata, next: PdfPatternMetadata): PdfPatternMetadata {
    return {
        name: current.name ?? next.name,
        author: current.author ?? next.author,
        circumference: current.circumference ?? next.circumference,
        repeatOfColors: current.repeatOfColors ?? next.repeatOfColors,
        rowsPerRepeat: current.rowsPerRepeat ?? next.rowsPerRepeat,
        totalRows: current.totalRows ?? next.totalRows,
        declaredTotalBeads: current.declaredTotalBeads ?? next.declaredTotalBeads,
    };
}

interface PdfImage {
    width: number;
    height: number;
    kind: number;
    data: Uint8Array | Uint8ClampedArray;
}

function isMetadataImage(image: { width: number; height: number }): boolean {
    // В экспортах схем таблица параметров — широкая картинка, схема плетения — высокая.
    return image.width >= 100 && image.height >= 30 && image.width >= image.height * 2;
}

async function encodeImage(image: PdfImage): Promise<Buffer | null> {
    if (!image.data) return null;
    let data = Buffer.from(image.data);
    let channels: 1 | 3 | 4;

    if (image.kind === ImageKind.RGB_24BPP) {
        channels = 3;
    } else if (image.kind === ImageKind.RGBA_32BPP) {
        channels = 4;
    } else if (image.kind === ImageKind.GRAYSCALE_1BPP) {
        channels = 1;
        data = Buffer.alloc(image.width * image.height);
        const stride = Math.ceil(image.width / 8);
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                data[y * image.width + x] = (image.data[y * stride + (x >> 3)] & (128 >> (x % 8))) ? 255 : 0;
            }
        }
    } else {
        return null;
    }

    return sharp(data, { raw: { width: image.width, height: image.height, channels } })
        .flatten({ background: '#ffffff' })
        .resize({ width: Math.min(image.width * 3, 2400) })
        .extend({ top: 12, bottom: 12, left: 12, right: 12, background: '#ffffff' })
        .png().toBuffer();
}

async function recognizeMetadata(image: Buffer): Promise<string> {
    const { createWorker, OEM, PSM } = await import('tesseract.js');
    const directory = await mkdtemp(join(tmpdir(), 'ameralds-pdf-ocr-'));
    let worker: Worker | undefined;

    try {
        // Обе модели установлены через npm; при распознавании доступ к сети не нужен.
        await Promise.all([
            copyFile(require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), join(directory, 'eng.traineddata.gz')),
            copyFile(require.resolve('@tesseract.js-data/rus/4.0.0_best_int/rus.traineddata.gz'), join(directory, 'rus.traineddata.gz')),
        ]);
        worker = await createWorker(['eng', 'rus'], OEM.LSTM_ONLY, {
            langPath: directory,
            cacheMethod: 'none',
            errorHandler: () => undefined,
        });
        await worker.setParameters({
            tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
        });
        const { data } = await worker.recognize(image);
        return data.text;
    } finally {
        try {
            await worker?.terminate();
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    }
}

export async function readPdfPageMetadata(
    page: PDFPageProxy,
    lines: string[],
    previous: PdfPatternMetadata,
): Promise<PdfPatternMetadata> {
    let metadata = mergeMetadata(previous, parsePdfPatternMetadata(lines));
    if (Object.values(metadata).every((value) => value !== null)) return metadata;

    const operators = await page.getOperatorList();
    const seen = new Set<string>();

    for (let index = 0; index < operators.fnArray.length; index++) {
        let image: PdfImage;
        if (operators.fnArray[index] === OPS.paintImageXObject) {
            const [id, width, height] = operators.argsArray[index];
            if (seen.has(id) || !isMetadataImage({ width, height })) continue;
            seen.add(id);
            const objects = id.startsWith('g_') ? page.commonObjs : page.objs;
            image = await new Promise<PdfImage>((resolve) => objects.get(id, resolve));
        } else if (operators.fnArray[index] === OPS.paintInlineImageXObject) {
            image = operators.argsArray[index][0];
            if (!isMetadataImage(image)) continue;
        } else {
            continue;
        }

        const encoded = await encodeImage(image);
        if (!encoded) continue;
        const text = await recognizeMetadata(encoded);
        metadata = mergeMetadata(metadata, parsePdfPatternMetadata(text.split(/\r?\n/)));
        if (Object.values(metadata).every((value) => value !== null)) break;
    }

    return metadata;
}
