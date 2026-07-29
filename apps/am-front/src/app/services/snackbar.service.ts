import { Injectable } from "@angular/core";
import { OperatorFunction, pipe } from "rxjs";
import { tap } from "rxjs/operators";
import { MatSnackBar, MatSnackBarConfig } from "@angular/material/snack-bar";


const DEFAULT_DURATION: number = 5000;

@Injectable({
    providedIn: 'root'
})
export class SnackService {
    constructor(
        private snackBar: MatSnackBar,
    ) {
    }

    public getSnackTap<T extends { result: boolean }>(message: string, duration: number = DEFAULT_DURATION): OperatorFunction<T, T> {
        return pipe(
            tap((result: T) => {
                if (result.result) {
                    this.snackBar.open(message, undefined, { duration });
                }
            })
        )
    }

    public informAfterResult<T>(message: string, duration: number = DEFAULT_DURATION): OperatorFunction<T, T> {
        return pipe(
            tap(() => this.snackBar.open(message, undefined, { duration })),
        )
    }

    public open(message: string, config?: MatSnackBarConfig): void {
        this.snackBar.open(message, undefined, {
            duration: DEFAULT_DURATION,
            ...config,
        });
    }
}
