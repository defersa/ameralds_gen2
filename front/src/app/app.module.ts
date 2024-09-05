import { BrowserModule } from '@angular/platform-browser';
import { LOCALE_ID, NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { registerLocaleData } from "@angular/common";
import localeRu from '@angular/common/locales/ru';
import localeRuExtra from '@angular/common/locales/extra/ru';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { StoreInterceptor } from './store.interceptor';
import { CoreModule } from './core/core.module';
import { AuthService } from './services/auth.service';
import { GoodsService } from './services/goods.service';
import { ProfileService } from './services/profile.service';


registerLocaleData(localeRu, 'ru-RU', localeRuExtra);

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        CoreModule,
        BrowserAnimationsModule
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
