import { inject, Injectable } from "@angular/core";
import { defer, Observable, throwError } from "rxjs";
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@am-front/services/auth.service';
import { SnackService } from "@am-front/services/snackbar.service";
import {
    type CreatePatternDto, FullPatternEntityDto,
    type PatternEntityDto,
    type PatternsPaginatedPageDto,
    ApiPatternsProducer, SuccessCreateDto
} from "@am-front/root/api-v2";


@Injectable({
    providedIn: 'root'
})
export class PatternsService {
    private readonly auth = inject(AuthService);
    private patternsProducer: ApiPatternsProducer = inject(ApiPatternsProducer);
    private snack: SnackService = inject(SnackService);

    public createPattern(body: CreatePatternDto): Observable<SuccessCreateDto> {
        return this.patternsProducer.patternsControllerCreate(body)
            .pipe(
                this.snack.informAfterResult('Схема создана'),
            );
    }

    public editPattern(id: number, body: CreatePatternDto): Observable<SuccessCreateDto> {
        return this.patternsProducer.patternsControllerEdit(id, body)
            .pipe(
                this.snack.informAfterResult('Схема обновлена'),
            );
    }

    public getPatterns(page: number, sizes?: Array<number>, categories?: Array<number>, query?: string): Observable<PatternsPaginatedPageDto> {
        return this.patternsProducer.patternsControllerPage(page, sizes, categories, query);
    }

    public getPattern(id: number): Observable<FullPatternEntityDto> {
        return this.patternsProducer.patternsControllerEntity(id);
    }

    /** Загружает страницу действующих покупок с фильтрами каталога; без авторизации запрос не отправляется. */
    public getPurchasedPatterns(page: number, sizes?: number[], categories?: number[], query?: string): Observable<PatternsPaginatedPageDto> {
        return defer(() => {
            if (!this.auth.auth()) {
                return throwError(() => new HttpErrorResponse({ status: 401 }));
            }

            return this.patternsProducer.patternsControllerPurchased(page, sizes, categories, query);
        });
    }

    /** Скачивает купленный материал через защищённую ручку; без авторизации возвращает 401 без HTTP-запроса. */
    public downloadPurchasedFile(patternId: number, fileId: number): Observable<Blob> {
        return defer(() => {
            if (!this.auth.auth()) {
                return throwError(() => new HttpErrorResponse({ status: 401 }));
            }

            return this.patternsProducer.purchasedPatternFilesControllerDownload(patternId, fileId);
        });
    }

    public getPatternsByIds(ids: number[] | string[]): Observable<Record<string, PatternEntityDto>> {
        return this.patternsProducer.patternsControllerByIds(ids.map(String));
    }
}
