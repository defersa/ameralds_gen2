import { Component, OnInit } from '@angular/core';
import { ProfileService } from "@am/services/profile.service";
import { DialogService } from "@am/core/dialog/dialog.service";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { switchMap, take } from "rxjs/operators";
import { of } from "rxjs";
import { IResultRequest } from "@am/interface/request.interface";
import { fromPromise } from "rxjs/internal-compatibility";


@Component({
    selector: 'amstore-verify',
    template: '<amstore-spinner></amstore-spinner>',
    styles: [`
        amstore-spinner {
            margin: auto;
        }
    `]
})
export class AmstoreVerifyComponent implements OnInit {

    constructor(
        private _activateRoute: ActivatedRoute,
        private _profile: ProfileService,
        private _router: Router,
        private _dialog: DialogService
    ) {

        this._activateRoute.queryParams?.pipe(
            take(1),
            switchMap((params: Params) => {
                if (!params.user || !params.token) {
                    return of({ result: false });
                }
                return this._profile.verifyProfile({ user: params.user, token: params.token });
            })
        ).subscribe((response: IResultRequest) => {
            fromPromise(this._router.navigate(['/']))
                .subscribe(() => {
                    this._dialog.openDialog({
                        data: {
                            title: response.result ? "Успешно" : "Ошибка",
                            text: response.result ? "Аккаунт был подтвержден. Теперь вам доступны все функции"
                                : "Что пошло не так: попробуйте повторно перейти по ссылке или перезапросите письмо"
                        }
                    })
                })
        });
    }

    ngOnInit(): void {
    }

}
