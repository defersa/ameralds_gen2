import { Directive, OnDestroy, OnInit } from '@angular/core';
import { environment } from "../../../environments/environment";

@Directive({
    selector: '[amstoreRecaptcha]'
})
export class RecaptchaDirective implements OnInit, OnDestroy {

    protected script?: HTMLScriptElement;

    public initRecaptchaScript(): void {
        this.script = document.createElement('script');
        this.script.type = 'text/javascript';
        this.script.src = `https://www.google.com/recaptcha/api.js?render=${environment.recaptcha.siteKey}`;
        document.documentElement.appendChild(this.script);
    }

    public ngOnInit() {
        this.initRecaptchaScript();
    }

    public ngOnDestroy() {
        if(this.script) {
            document.documentElement.removeChild(this.script);
            document.querySelector('.grecaptcha-badge')?.remove();
        }
    }
}
