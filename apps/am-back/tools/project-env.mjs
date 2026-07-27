import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';


const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');


function getProjectEnv() {
    const path = join(repoRoot, '.env');

    const body = fs.readFileSync(path).toString();

    return Object.fromEntries(body.split('\n').filter(Boolean).map((node) => node.split('=')));
}

export default getProjectEnv();
