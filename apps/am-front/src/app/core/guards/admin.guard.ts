import { inject, Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { ProfileService } from "@am-front/services/profile.service";
import { EnumUserRole } from "@am-front/root/api-v2";


@Injectable({
    providedIn: 'root'
})
export class AdminGuard  {
    private _profileService: ProfileService = inject(ProfileService);

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this._profileService.userStatus() === EnumUserRole.Admin;
    }

    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this._profileService.userStatus() === EnumUserRole.Admin;
    }
}
