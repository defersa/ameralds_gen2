import { Component, inject } from "@angular/core";
import { ProfileService } from "@am/services/profile.service";
import { DialogService } from "@am/core/dialog/dialog.service";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { switchMap, take } from "rxjs/operators";
import { of } from "rxjs";
import { IResultRequest } from "@am/interface/request.interface";
import { fromPromise } from "rxjs/internal-compatibility";
import { AmstoreSpinnerComponent } from "@am/cdk/spinner/spinner.component";


@Component({
    selector: "amstore-verify",
    template: "<amstore-spinner/>",
    styles: [`
        amstore-spinner {
            margin: auto;
        }
    `],
    standalone: true,
    imports: [
        AmstoreSpinnerComponent
    ]
})
export class AmstoreVerifyComponent {
    private _activateRoute: ActivatedRoute = inject(ActivatedRoute);
    private _profile: ProfileService = inject(ProfileService);
    private _router: Router = inject(Router);
    private _dialog: DialogService = inject(DialogService);

    constructor(
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
}
