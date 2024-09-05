import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecaptchaDirective } from './recaptcha.directive';


@NgModule({
    declarations: [RecaptchaDirective],
    imports: [
        CommonModule
    ]
})
export class RecaptchaModule {
}
