import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { OverlayModule } from '@angular/cdk/overlay';

import { AmstoreCdkModule } from '@am/cdk/cdk.module';

import { LocalStorageService } from './services/local-storage.service';
import { AuthService } from '../services/auth.service';
import { AmastoreLanguageComponent } from './language/language.component';
import { AmstoreHeaderModule } from './header/header.module';
import { AmstoreGoodsModule } from './goods-snap/goods.module';
import { AmstoreProfileModule } from './profile/profile.module';
import { DialogModule } from "./dialog/dialog.module";


@NgModule({
    declarations: [
        AmastoreLanguageComponent
    ],
    providers: [
        LocalStorageService,
        AuthService
    ],
    imports: [
        HttpClientModule,
        CommonModule,
        OverlayModule,
        AmstoreCdkModule,
        AmstoreHeaderModule,
        AmstoreGoodsModule,
        AmstoreProfileModule,
        DialogModule
    ],
    exports: [
        AmastoreLanguageComponent,
        AmstoreHeaderModule,
        AmstoreGoodsModule,
        AmstoreProfileModule
    ]
})
export class CoreModule {
}
