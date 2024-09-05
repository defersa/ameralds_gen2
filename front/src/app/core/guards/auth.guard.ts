import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { ProfileService } from "@am/services/profile.service";
import { UserEnum } from "@am/utils/router-builder";


@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
    constructor(private _profileService: ProfileService) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return [UserEnum.Authorized, UserEnum.Moder].includes(this._profileService.userStatus$.getValue());
    }

    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return [UserEnum.Authorized, UserEnum.Moder].includes(this._profileService.userStatus$.getValue());
    }
}
