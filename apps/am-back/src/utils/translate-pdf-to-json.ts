import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parsePdfPatternMetadata, readPdfPageMetadata, type PdfPatternMetadata } from './pdf-pattern-metadata';

export interface PdfSequenceItem {
    color: string;
    count: number;
}

export interface PdfTranslationResult extends PdfPatternMetadata {
    sequence: PdfSequenceItem[];
    totalBeads: number;
}

interface TextCell {
    text: string;
    x: number;
    y: number;
}

interface PositionedEntry extends PdfSequenceItem {
    x: number;
    y: number;
}

/**
 * Извлекает параметры схемы и группы бисера a–z из PDF.
 * Группы читаются из текстового слоя со второй страницы, таблицы параметров — также через OCR.
 * Порядок: страницы по возрастанию, столбцы слева направо, группы сверху вниз.
 * Ошибки чтения PDF передаются вызывающему коду.
 */
export async function translatePdfToJson(blob: Blob): Promise<PdfTranslationResult> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const loadingTask = getDocument({ data: bytes });

    try {
        const pdf = await loadingTask.promise;
        let metadata = parsePdfPatternMetadata([]);
        const sequence: PdfSequenceItem[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            try {
                const content = await page.getTextContent();
                const items: TextCell[] = content.items
                    .filter((item) => 'str' in item)
                    .map((item) => ({
                        text: item.str.trim(),
                        x: item.transform[4],
                        y: item.transform[5],
                    }))
                    .filter((item) => item.text.length > 0)
                    .sort((a, b) => b.y - a.y || a.x - b.x);

                // Группируем элементы в горизонтальные строки.
                const rows: { y: number; items: TextCell[] }[] = [];

                for (const item of items) {
                    let row = rows.find((row) => Math.abs(row.y - item.y) < 3);

                    if (!row) {
                        row = { y: item.y, items: [] };
                        rows.push(row);
                    }

                    row.items.push(item);
                }

                metadata = await readPdfPageMetadata(
                    page,
                    rows.map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ')),
                    metadata,
                );
                if (pageNum === 1) continue;

                const entries: PositionedEntry[] = [];

                for (const row of rows) {
                    const cells = row.items.sort((a, b) => a.x - b.x);

                    for (let i = 0; i < cells.length; i++) {
                        const cell = cells[i];
                        const combined = cell.text.match(/^([a-z])\s+(\d+)$/);

                        // Буква и число могут находиться в одном текстовом фрагменте.
                        if (combined) {
                            entries.push({
                                color: combined[1],
                                count: Number(combined[2]),
                                x: cell.x,
                                y: cell.y,
                            });
                            continue;
                        }

                        if (!/^[a-z]$/.test(cell.text)) continue;

                        const next = cells[i + 1];

                        // Либо число находится в соседнем фрагменте справа.
                        if (
                            next &&
                            /^\d+$/.test(next.text) &&
                            next.x > cell.x &&
                            next.x - cell.x < 35
                        ) {
                            entries.push({
                                color: cell.text,
                                count: Number(next.text),
                                x: cell.x,
                                y: cell.y,
                            });
                            i++;
                        }
                    }
                }

                const columns: { x: number; entries: PositionedEntry[] }[] = [];

                for (const entry of entries.sort((a, b) => a.x - b.x)) {
                    let column = columns.find((column) => Math.abs(column.x - entry.x) < 10);

                    if (!column) {
                        column = { x: entry.x, entries: [] };
                        columns.push(column);
                    }

                    column.entries.push(entry);
                }

                columns.sort((a, b) => a.x - b.x);

                const ordered = columns.flatMap((column) =>
                    column.entries
                        .sort((a, b) => b.y - a.y)
                        .map(({ color, count }) => ({ color, count })),
                );

                sequence.push(...ordered);
            } finally {
                page.cleanup();
            }
        }

        const { info } = await pdf.getMetadata();
        const title = 'Title' in info && typeof info.Title === 'string' ? info.Title.trim() || null : null;
        const author = 'Author' in info && typeof info.Author === 'string' ? info.Author.trim() || null : null;

        return {
            ...metadata,
            name: metadata.name ?? title,
            author: metadata.author ?? author,
            sequence,
            totalBeads: sequence.reduce((sum, item) => sum + item.count, 0),
        };
    } finally {
        await loadingTask.destroy();
    }
}
