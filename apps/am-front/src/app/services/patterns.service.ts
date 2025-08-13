import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { SnackService } from "@am-front/services/snackbar.service";
import {
    type CreatePatternDto, FullPatternEntityDto,
    type PatternEntityDto,
    type PatternsPaginatedPageDto,
    PatternsProducer, SuccessCreateDto
} from "@am-front/root/api";


@Injectable({
    providedIn: 'root'
})
export class PatternsService {
    private patternsProducer: PatternsProducer = inject(PatternsProducer);
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

    public getPatterns(page: number): Observable<PatternsPaginatedPageDto> {
        return this.patternsProducer.patternsControllerPage(page);
    }

    public getPattern(id: number): Observable<FullPatternEntityDto> {
        return this.patternsProducer.patternsControllerEntity(id);
    }

    public getPatternsByIds(ids: number[] | string[]): Observable<Record<string, PatternEntityDto>> {
        return this.patternsProducer.patternsControllerByIds(ids.map(String));
    }
}
