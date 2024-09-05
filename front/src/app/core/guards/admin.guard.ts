import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { ProfileService } from "@am/services/profile.service";
import { UserEnum } from "@am/utils/router-builder";


@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate, CanActivateChild {
    constructor(private _profileService: ProfileService) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this._profileService.userStatus$.getValue() === UserEnum.Moder;
    }

    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot):
        Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this._profileService.userStatus$.getValue() === UserEnum.Moder;
    }
}
