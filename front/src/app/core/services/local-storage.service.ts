import { Injectable } from '@angular/core';


@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {

    constructor() { }

    public getVariable(name: string): unknown {
        return window.localStorage.getItem(name);
    }

    public setVariable(name: string, value: string): void {
        window.localStorage.setItem(name, value);
    }

    public removeVariable(name: string): void {
        window.localStorage.removeItem(name);
    }
}
