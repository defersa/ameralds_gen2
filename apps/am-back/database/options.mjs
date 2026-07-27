import env from '../tools/project-env.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { DataSource } from "typeorm";


const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const myDataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    entities: [
        join(appRoot, 'src/db/entities/**/*.entity.ts'),
    ],
    migrations: [
        join(appRoot, 'database/migrations/**/*.ts'),
    ],
    cli: {
        migrationsDir: join(appRoot, 'database/migrations'),
    },
    logging: true,
});

export default myDataSource;
