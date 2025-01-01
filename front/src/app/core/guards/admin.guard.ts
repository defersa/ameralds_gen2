import { inject, Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { ProfileService } from "@am/services/profile.service";
import { EnumUserRole } from "@am/root/api";


@Injectable({
    providedIn: 'root'
})
export class AdminGuard  {
    private _profileService: ProfileService = inject(ProfileService);

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this._profileService.userStatus$.getValue() === EnumUserRole.ADMIN;
    }

    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this._profileService.userStatus$.getValue() === EnumUserRole.ADMIN;
    }
}
