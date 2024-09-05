import env from '../tools/project-env.mjs';
import { DataSource } from "typeorm";


const myDataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    entities: [
        'src/db/entities/**/**.entity.ts',
    ],
    migrations: [
        'database/migrations/**.ts',
    ],
    cli: {
        migrationsDir: 'database/migrations',
    },
    logging: true,
});

export default myDataSource;
