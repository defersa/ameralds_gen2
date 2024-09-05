import { Global, Module } from "@nestjs/common";

export interface AppConfigInterface {
    filesPath: string[];
    previewImagesPath: string[];
    fullImagesPath: string[];
}

export const APP_CONFIG: string = "APP_CONFIG";

export const appConfigModule: AppConfigInterface = {
    filesPath: ["uploads", "files"],
    previewImagesPath: ["uploads", "images", "preview"],
    fullImagesPath: ["uploads", "images", "full"],
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
