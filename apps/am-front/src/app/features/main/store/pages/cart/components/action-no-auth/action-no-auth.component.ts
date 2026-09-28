import { Component, inject } from '@angular/core';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AmstoreInfoComponent } from '@am-front/cdk/info/info.component';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { AmstoreLoginComponent } from '@am-front/core/profile/login/login.component';

@Component({
    selector: 'amstore-cart-action-no-auth',
    templateUrl: './action-no-auth.component.html',
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        AmstoreInfoComponent,
    ],
})
export class ActionNoAuthComponent {
    private readonly dialogService: DialogService = inject(DialogService);

    public login(): void {
        this.dialogService.openCustomDialog(AmstoreLoginComponent, {
            panelClass: 'amstore-dialog-login-panel',
            minWidth: '400px',
        });
    }
}
