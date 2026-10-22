import { inject, Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '@am-front/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
    private auth = inject(AuthService);
    private router = inject(Router);

    public canActivate(): boolean | UrlTree {
        return this.auth.auth() || this.router.parseUrl('/');
    }

    public canActivateChild(): boolean | UrlTree {
        return this.canActivate();
    }
}
