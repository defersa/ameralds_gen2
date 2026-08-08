import type { GeneratorConfig } from "ng-openapi";


const config: GeneratorConfig = {
    input: "http://localhost:3000/swagger/schema",
    output: "./src/app/api-v2",
    options: {
        dateType: "Date",
        enumStyle: "enum",
        naming: {
            services: { prefix: 'Api', suffix: 'Producer' },
            models: { }
        }
    },
};

export default config;
