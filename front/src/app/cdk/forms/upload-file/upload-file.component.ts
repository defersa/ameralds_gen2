import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { AmstoreFormsBaseDirective } from '../forms.abstract.directive';
import { DestroyService } from "@am/utils/destroy.service";

type FileStatus = 'empty' | 'uploaded' | 'saved';

const STATUS_LABEL: Record<FileStatus, string> = {
    'empty': 'Пусто',
    'uploaded': 'Загр',
    'saved': 'Сохр'
}

@Component({
    selector: 'amstore-form-upload-file',
    templateUrl: './upload-file.component.html',
    styleUrls: ['./upload-file.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [DestroyService],
    host: {
        class: 'amstore-form-upload-file',
    }
})
export class AmstoreUploadFileComponent extends AmstoreFormsBaseDirective implements OnInit, OnDestroy {
    @ViewChild('imageInput')
    private imageInputRef: ElementRef | undefined;

    private _destroyed: Subject<void> = new Subject<void>();

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

    @Input()
    public format: string = '.png';

    public name: string = '';

    public ngOnInit(): void {
        this.control.valueChanges
            .pipe(
                takeUntil(this._destroyed),
                startWith(this.control.value)
            )
            .subscribe((value: File | { id: string; name: string; } | null) => this._updateFormControlStatus(value));
    }

    public ngOnDestroy(): void {
        this._destroyed.next();
        this._destroyed.complete();
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
