import fs from 'fs';


function getProjectEnv() {
    const path = `.env`;

    const body = fs.readFileSync(path).toString();

    return Object.fromEntries(body.split('\n').filter(Boolean).map((node) => node.split('=')));
}

export default getProjectEnv();
