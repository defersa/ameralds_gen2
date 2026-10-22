import {
  ApplicationConfig,
  importProvidersFrom,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import localeRuExtra from '@angular/common/locales/extra/ru';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AuthInterceptor } from './auth.interceptor';
import { DownloadInterceptor } from './download.interceptor';
import { appRoutes } from './app.routes';
import { provideApiClient } from './api-client.providers';
import { AuthService } from './services/auth.service';

registerLocaleData(localeRu, 'ru-RU', localeRuExtra);

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(AuthService).initialize()),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideAnimations(),
    provideApiClient(),
    provideHttpClient(
      withInterceptors([AuthInterceptor, DownloadInterceptor]),
      withInterceptorsFromDi(),
    ),
    {
      provide: LOCALE_ID,
      useValue: 'ru-RU',
    },
    importProvidersFrom(
      NgxSkeletonLoaderModule.forRoot({
        animation: 'progress',
        appearance: 'line',
        theme: {
          'border-radius': '4px',
        },
      }),
    ),
  ],
};
