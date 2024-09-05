import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AmstoreFormsBaseDirective } from '../forms.abstract.directive';
import { IconsName } from "@am/cdk/icons/icons.map";
import { DestroyService } from "@am/utils/destroy.service";


@Component({
    selector: 'amstore-forms-input',
    templateUrl: './input.component.html',
    styleUrls: ['./input.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [DestroyService],
})
export class AmstoreInputComponent extends AmstoreFormsBaseDirective {
    @Input()
    public get type(): string {
        return this._type;
    }
    public set type(value: string) {
        this._type = value;
    }
    private _type: string = 'text';


    @Input()
    public suffixName: IconsName | undefined;

    @Output()
    public onSuffixClick: EventEmitter<void> = new EventEmitter<void>();

    public emitSuffixClick(): void {
        this.onSuffixClick.emit();
    }
}
