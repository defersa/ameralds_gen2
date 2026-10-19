const { resolve } = require('node:path');
const { before } = require('@nestjs/swagger/plugin');

// Метаданные Swagger компилируются только в отдельном процессе генерации.
const compiler = require('ts-node').register({
    project: resolve(__dirname, '../apps/am-back/tsconfig.app.json'),
    transpileOnly: false,
    transformers: (program) => ({
        before: [before({
            dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
            controllerFileNameSuffix: ['.controller.ts'],
            classValidatorShim: true,
            classTransformerShim: true,
            introspectComments: true,
        }, program)],
    }),
});

require('tsconfig-paths').register({
    baseUrl: compiler.config.options.baseUrl,
    paths: compiler.config.options.paths,
});

require('./generate-front-api.ts').generateFrontApi().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
