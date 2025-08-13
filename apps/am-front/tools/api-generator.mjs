import * as OpenAPI from 'openapi-typescript-codegen';


OpenAPI.generate({
    input: 'http://localhost:3000/swagger/schema',
    output: './apps/am-front/src/app/api',
    httpClient: 'angular',
    postfixServices: 'Producer'
});
