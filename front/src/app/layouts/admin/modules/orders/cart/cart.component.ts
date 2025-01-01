import { Component, inject } from "@angular/core";
import { AdminOrderService } from "@am/services/admin-order.service";
import { IAdminCart, IPatternPurchase } from "@am/interface/order.interface";
import { map, switchMap, take } from "rxjs/operators";
import { Observable } from "rxjs";
import { IPattern } from "@am/interface/pattern.interface";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { SnackService } from "@am/services/snackbar.service";
import { Router } from "@angular/router";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { AsyncPipe } from "@angular/common";
import { ImageListComponent } from "@am/shared/image-list/image-list.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { PatternCartComponent } from "@am/shared/actions/pattern/cart/pattern-cart.component";


@Component({
    selector: "admin-cart",
    templateUrl: "./cart.component.html",
    styleUrls: ["./cart.component.scss"],
    standalone: true,
    imports: [
        AmstoreInputComponent,
        ReactiveFormsModule,
        AsyncPipe,
        ImageListComponent,
        AmstoreButtonComponent,
        PatternCartComponent
    ]
})
export class CartComponent {
    private adminOrder: AdminOrderService = inject(AdminOrderService);
    private snackService: SnackService = inject(SnackService);
    private router: Router = inject(Router);

    public order$: Observable<IAdminCart> = this.adminOrder.order$;
    public patterns$: Observable<IPattern[]> = this.order$
        .pipe(
            take(1),
            map(() => [])
            // switchMap((order: IAdminCart) => this.patternService.getPatternsByIds(order.purchases.map((item: IPatternPurchase) => item.pattern)))
        );

    public emailControl: FormControl = new FormControl('', [Validators.required, Validators.email]);

    public sendOrder(order: IAdminCart): void {
        this.adminOrder.sendOrder({
            email: this.emailControl.value,
            order,
        })
            .pipe(this.snackService.getSnackTap('Заказ отправлен!'))
            .subscribe((result) => {
                this.adminOrder.clearOrder();
                this.router.navigate(['admin', 'orders', 'list']);
            });
    }
}
