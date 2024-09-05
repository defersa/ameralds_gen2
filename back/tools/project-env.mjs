import fs from 'fs';
import process from 'process';


function getProjectEnv() {
    const path = `env/.${process.env.NODE_ENV ?? 'dev'}.env`;

    const body = fs.readFileSync(path).toString();

    return Object.fromEntries(body.split('\n').filter(Boolean).map((node) => node.split('=')));
}

export default getProjectEnv();
