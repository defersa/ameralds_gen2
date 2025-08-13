import { BrowserModule } from '@angular/platform-browser';
import { LOCALE_ID, NgModule } from '@angular/core';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import localeRuExtra from '@angular/common/locales/extra/ru';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from '@am-front/core/header/header.component';
import { AmstoreHeaderAdminComponent } from '@am-front/core/header/admin/admin.component';
import { AmastoreLanguageComponent } from '@am-front/core/language/language.component';
import { CartSnapComponent } from '@am-front/core/cart-snap/cart-snap.component';
import { ProfileComponent } from '@am-front/core/profile/profile.component';
import { AuthInterceptor } from '@am-front/root/auth.interceptor';
import { DownloadInterceptor } from '@am-front/root/download.interceptor';


registerLocaleData(localeRu, 'ru-RU', localeRuExtra);

@NgModule({
    declarations: [
        AppComponent
    ],
    bootstrap: [AppComponent],
    imports: [BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        HeaderComponent,
        AmstoreHeaderAdminComponent,
        AmastoreLanguageComponent,
        CartSnapComponent,
        ProfileComponent
    ], providers: [
        provideHttpClient(withInterceptors([AuthInterceptor, DownloadInterceptor])),
        {
            provide: LOCALE_ID,
            useValue: 'ru-RU'
        },
        provideHttpClient(withInterceptorsFromDi())
    ]
})
export class AppModule {
}
