import {
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    InputSignal,
    OnInit,
    ViewChild,
    ViewEncapsulation
} from "@angular/core";
import { startWith } from 'rxjs/operators';
import { AmstoreFormsBaseDirective } from '../forms.abstract.directive';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { AsyncPipe } from "@angular/common";
import { ErrorsPipe } from "@am/cdk/forms/errors/errors.pipe";

type FileStatus = 'empty' | 'uploaded' | 'saved';

const STATUS_LABEL: Record<FileStatus, string> = {
    'empty': 'Пусто',
    'uploaded': 'Загр',
    'saved': 'Сохр'
}

@Component({
    selector: "amstore-form-upload-file",
    templateUrl: "./upload-file.component.html",
    styleUrls: ["./upload-file.component.scss"],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        IconsComponent,
        AsyncPipe,
        ErrorsPipe
    ],
    host: {
        class: "amstore-form-upload-file"
    }
})
export class AmstoreUploadFileComponent extends AmstoreFormsBaseDirective implements OnInit {
    @ViewChild('imageInput')
    private imageInputRef: ElementRef | undefined;

    public destroyRef: DestroyRef = inject(DestroyRef);

    public state: FileStatus = 'empty'

    public savedFile: { id: string } | null = null;

    public get status(): string {
        return STATUS_LABEL[this.state];
    }

    public get isEmpty(): boolean {
        return this.state === 'empty';
    }

    public get isSaved(): boolean {
        return this.state === 'saved';
    }

    public get isUploaded(): boolean {
        return this.state === 'uploaded';
    }

    public format: InputSignal<string> = input('.png');

    public name: string = '';

    public ngOnInit(): void {
        this.control.valueChanges
            .pipe(
                startWith(this.control.value),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((value: File | { id: string; name: string; } | null) => this._updateFormControlStatus(value));
    }

    private _updateFormControlStatus(value: File | { id: string; name: string; } | null): void {
        if (value instanceof File) {
            this.name = value.name;
            this.state = 'uploaded';
        } else if (value?.id) {
            this.name = value.name;
            this.state = 'saved';

            this.savedFile = value;
        } else {
            this.name = "Пусто";
            this.state = 'empty';
        }
    }

    public callInputDialog(): void {
        ((this.imageInputRef as ElementRef).nativeElement as HTMLBaseElement).click();
    }

    public dropFiles(fileList: EventTarget | null): void {
        const files: FileList | null = fileList ? (fileList as HTMLInputElement).files : null;
        this.control.setValue(files?.[0] || null);
        this.control.markAsTouched();
    }

    public clearControl(): void {
        this.control.setValue(null);
        this.control.markAsTouched();
    }

    public refreshValue(): void {
        this.control.setValue(this.savedFile);
        this.control.markAsTouched();
    }
}
