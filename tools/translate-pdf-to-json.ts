import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import type { PdfTranslationResult } from '../apps/am-back/src/utils/translate-pdf-to-json';

const usage = `Использование: npm run am:back:pdf:json -- <файл.pdf> [другой.pdf ...]
Один файл: объект с параметрами схемы, sequence и totalBeads.
Несколько файлов: массив объектов { file, result }.
Сохранение JSON: npm run --silent am:back:pdf:json -- файл.pdf > result.json
Разбор начинается со второй страницы PDF.
`;

async function main(): Promise<void> {
    const { positionals: files, values } = parseArgs({
        allowPositionals: true,
        options: { help: { type: 'boolean', short: 'h' } },
    });

    if (values.help) {
        process.stdout.write(usage);
        return;
    }

    if (files.length === 0) {
        throw new Error(usage);
    }

    // PDF.js использует console.log для предупреждений, оставляем stdout для JSON.
    console.log = console.error.bind(console);
    const { translatePdfToJson } = await import('../apps/am-back/src/utils/translate-pdf-to-json');
    const results: { file: string; result: PdfTranslationResult }[] = [];

    for (const file of files) {
        try {
            const bytes = new Uint8Array(await readFile(file));
            const blob = new Blob([bytes], { type: 'application/pdf' });
            results.push({ file, result: await translatePdfToJson(blob) });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`${file}: ${message}`);
        }
    }

    const output = results.length === 1 ? results[0].result : results;
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
