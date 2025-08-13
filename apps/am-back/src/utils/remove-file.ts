import { unlinkSync } from "fs";
import { join } from "path";
import { process } from "@am-back/core/declare/process";


export function removeFile(...path: string[]) {
    unlinkSync(join(process.cwd(), ...path));
}
