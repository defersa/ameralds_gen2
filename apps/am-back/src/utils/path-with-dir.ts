import { dirname, join, resolve } from "path";
import { process } from "@am-back/core/declare/process";
import { existsSync, mkdirSync } from "fs";


const uploadsFolderName: string = "uploads";

function getUniquePaths(paths: string[]): string[] {
    return [...new Set(paths.map((path: string) => resolve(path)))];
}

export function getUploadsRoot(): string {
    const paths: string[] = getUniquePaths([
        process.env.AM_UPLOADS_ROOT || "",
        join(process.cwd(), uploadsFolderName),
        join(__dirname, uploadsFolderName),
        join(__dirname, "..", "..", "..", uploadsFolderName),
        join(__dirname, "..", "..", "..", "..", uploadsFolderName),
    ].filter(Boolean));

    return paths.find((path: string) => existsSync(path)) || paths[0];
}

export function getUploadsPath(...path: string[]): string {
    const localPath: string[] = path.flatMap((item: string) => item.split(/[\\/]/));
    const pathWithoutRoot: string[] = localPath[0] === uploadsFolderName ? localPath.slice(1) : localPath;

    return join(getUploadsRoot(), ...pathWithoutRoot);
}

export function getPathWithDir(...path: string[]): string {
    const filePath: string = getUploadsPath(...path);
    const dirPath: string = dirname(filePath);

    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }

    return filePath;
}
