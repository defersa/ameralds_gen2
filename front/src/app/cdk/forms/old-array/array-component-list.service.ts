import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';

@Injectable({
    providedIn: 'root'
})
export class ArrayComponentListService {

    private _controlObj: Record<string, UntypedFormControl[]> = {};

    constructor() { }

    public getControls(name: string): UntypedFormControl[] {
        if (!this._controlObj[name]) {
           return [];
        }
        return this._controlObj[name];
    }

    public addControl(name: string, control: UntypedFormControl): void {
        if (!this._controlObj[name]) {
            this._controlObj[name] = [];
        }

        this._controlObj[name].push(control);
    }

    public removeControl(name: string, control: UntypedFormControl): void {
        if (this._controlObj[name]) {
            this._controlObj[name] = this._controlObj[name].filter((item: UntypedFormControl) => item !== control);
        }
    }

}
