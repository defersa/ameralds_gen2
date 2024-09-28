import { BrowserModule } from '@angular/platform-browser';
import { LOCALE_ID, NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { registerLocaleData } from "@angular/common";
import localeRu from '@angular/common/locales/ru';
import localeRuExtra from '@angular/common/locales/extra/ru';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { StoreInterceptor } from './store.interceptor';
import { AuthService } from './services/auth.service';
import { GoodsService } from './services/goods.service';
import { ProfileService } from './services/profile.service';
import { HeaderComponent } from "@am/core/header/header.component";
import { AmstoreHeaderAdminComponent } from "@am/core/header/admin/admin.component";
import { AmastoreLanguageComponent } from "@am/core/language/language.component";
import { GoodsSnapComponent } from "@am/core/goods-snap/goods-snap.component";
import { ProfileComponent } from "@am/core/profile/profile.component";


registerLocaleData(localeRu, 'ru-RU', localeRuExtra);

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        HeaderComponent,
        AmstoreHeaderAdminComponent,
        AmastoreLanguageComponent,
        GoodsSnapComponent,
        ProfileComponent,
        HttpClientModule,
    ],
    providers: [
        AuthService,
        GoodsService,
        ProfileService,

        { provide: HTTP_INTERCEPTORS, useClass: StoreInterceptor, multi: true },
        {
            provide: LOCALE_ID,
            useValue: 'ru-RU'
        },
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
