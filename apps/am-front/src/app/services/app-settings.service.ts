import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, forkJoin, Observable, throwError } from 'rxjs';
import { ApiAppSettingsProducer, AppSettingsHistoryDto, AppSettingsVersionDto, CreateAppSettingsDto } from '../api-v2';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';

export interface AppSettingsPageData {
    current: AppSettingsVersionDto;
    history: AppSettingsHistoryDto;
}

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
    private readonly api = inject(ApiAppSettingsProducer);
    private readonly auth = inject(AuthService);
    private readonly profile = inject(ProfileService);

    public current(): Observable<AppSettingsVersionDto> {
        return this.authorized(() => this.api.appSettingsControllerCurrent());
    }

    public history(page: number): Observable<AppSettingsHistoryDto> {
        return this.authorized(() => this.api.appSettingsControllerHistory(page));
    }

    public loadPage(page: number): Observable<AppSettingsPageData> {
        return forkJoin({ current: this.current(), history: this.history(page) });
    }

    public create(body: CreateAppSettingsDto): Observable<AppSettingsVersionDto> {
        return this.authorized(() => this.api.appSettingsControllerCreate(body));
    }

    private authorized<T>(request: () => Observable<T>): Observable<T> {
        return defer(() => this.auth.auth() && this.profile.isAdmin()
            ? request() : throwError(() => new HttpErrorResponse({ status: 403 })));
    }
}
