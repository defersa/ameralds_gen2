import { join } from "path";
import { process } from "@am-back/core/declare/process";
import { existsSync, mkdirSync } from "fs";


export function getPathWithDir(...path: string[]): string {
    [...path]
        .filter((item: string, index: number) => index + 1 !== path.length)
        .reduce((path: string, part: string) => {
            const localPath: string = join(path, part);

            if (!existsSync(localPath)) {
                mkdirSync(localPath);
            }

            return localPath;
        }, process.cwd());

    return join(process.cwd(), ...path);
}

