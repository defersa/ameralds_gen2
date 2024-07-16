import env from '../tools/project-env.mjs';


console.log(env.DB_HOST)

export default {
    type: 'postgres',
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    entities: [
        'src/db/entities/**/**.entity{.ts,.js}',
    ],
    migrations: [
        'database/migrations/*.ts',
    ],
    cli: {
        migrationsDir: 'database/migrations',
    },
};
