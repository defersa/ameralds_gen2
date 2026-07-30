import { unlinkSync } from "fs";
import { getUploadsPath } from "./path-with-dir";


export function removeFile(...path: string[]) {
    unlinkSync(getUploadsPath(...path));
}
