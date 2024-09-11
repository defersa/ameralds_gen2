import * as OpenAPI from 'openapi-typescript-codegen';


OpenAPI.generate({
    input: 'http://localhost:3000/swagger/schema',
    output: './src/app/api',
    httpClient: 'angular',
});
