import { Component, inject } from "@angular/core";
import { AdminCartService } from "@am-front/services/cart/sources/admin-cart.service";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { SnackService } from "@am-front/services/snackbar.service";
import { Router } from "@angular/router";
import { AmstoreInputComponent } from "@am-front/cdk/forms/input/input.component";


@Component({
    selector: "admin-cart",
    templateUrl: "./cart.component.html",
    styleUrls: ["./cart.component.scss"],
    imports: [
        AmstoreInputComponent,
        ReactiveFormsModule,
    ]
})
export class CartComponent {
    private adminOrder: AdminCartService = inject(AdminCartService);
    private snackService: SnackService = inject(SnackService);
    private router: Router = inject(Router);


    public emailControl: FormControl = new FormControl('', [Validators.required, Validators.email]);

}
