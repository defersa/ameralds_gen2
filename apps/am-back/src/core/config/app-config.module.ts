import { Global, Module } from "@nestjs/common";


export interface AppConfigInterface {
    filesPath: string[];
    privateFilesPath: string[];
    previewImagesPath: string[];
    fullImagesPath: string[];
}

export const APP_CONFIG: string = "APP_CONFIG";

const rootFolderName: string = "uploads";

export const appConfigModule: AppConfigInterface = {
    filesPath: [rootFolderName, "public", "files"],
    previewImagesPath: [rootFolderName, "public", "images", "preview"],
    fullImagesPath: [rootFolderName, "public", "images", "full"],
    privateFilesPath: [rootFolderName, "private", "pattern"],
}

@Global()
@Module({
    providers: [
        {
            provide: APP_CONFIG,
            useValue: appConfigModule,
        }
    ],
    exports: [APP_CONFIG],
})
export class AppConfigModule {}
