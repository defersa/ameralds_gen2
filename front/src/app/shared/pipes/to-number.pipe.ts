import { Pipe, PipeTransform } from '@angular/core';


@Pipe({
    name: 'toNumber',
    standalone: true,
})
export class ToNumberPipe implements PipeTransform {
    public transform: NumberConstructor = Number;

}
