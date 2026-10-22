import { inject, Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { map, Observable } from 'rxjs';
import { ProfileService } from '@am-front/services/profile.service';
import { AuthService } from '@am-front/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard {
    private auth = inject(AuthService);
    private profile = inject(ProfileService);
    private router = inject(Router);

    public canActivate(): Observable<boolean | UrlTree> | UrlTree {
        if (!this.auth.auth()) {
            return this.router.parseUrl('/');
        }
        return this.profile.loadProfile().pipe(map(() => this.profile.isAdmin() || this.router.parseUrl('/')));
    }

    public canActivateChild(): Observable<boolean | UrlTree> | UrlTree {
        return this.canActivate();
    }
}
