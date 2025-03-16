import {
    Component,
    ElementRef,
    inject,
    input,
    InputSignal,
    OnInit, Signal, viewChild,
    ViewEncapsulation
} from "@angular/core";
import { startWith } from "rxjs/operators";
import { AmstoreFormsBaseDirective } from "../forms.abstract.directive";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { AsyncPipe } from "@angular/common";
import { ErrorsPipe } from "@am/cdk/forms/errors/errors.pipe";
import { FileDto, FilesProducer } from "@am/root/api";
import { downloadBlobFile } from "@am/utils/file-utils";


@Component({
    selector: "amstore-form-upload",
    templateUrl: "./upload.component.html",
    styleUrls: ["./upload.component.scss"],
    encapsulation: ViewEncapsulation.None,
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
export class AmstoreUploadComponent extends AmstoreFormsBaseDirective implements OnInit {
    private imageInputRef: Signal<ElementRef> = viewChild("imageInput");

    public format: InputSignal<string> = input(".png");

    public filesProducer: FilesProducer = inject(FilesProducer);

    public name: string = "";

    private _fileReader: FileReader = new FileReader();
    private _file: globalThis.File = null;

    public ngOnInit(): void {
        super.ngOnInit();

        this.control.valueChanges
            .pipe(
                startWith(this.control.value),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((file: FileDto) => {
                if (!file) {
                    this.name = null;

                    return;
                }

                this.name = file.name;
            });

        this._initFileReader();
    }

    public callInputDialog(): void {
        this.imageInputRef().nativeElement.click();
    }

    public dropFiles(fileList: EventTarget | null): void {
        const files: FileList | null = fileList ? (fileList as HTMLInputElement).files : null;
        const file: globalThis.File | null | undefined = files ? files.item(0) : undefined;

        if (file) {
            this._file = file;
            this._fileReader.readAsDataURL(file as unknown as Blob);
        }
    }

    public clearControl(): void {
        this.control.setValue(null);
        this.control.markAsTouched();
    }

    public downloadFile(): void {
        const id: number = this.control.value.id;

        this.filesProducer.filesControllerGetPrivateFile(id)
            .subscribe(
                (file: Blob) => downloadBlobFile(file, this.name)
            );
    }

    private _initFileReader(): void {
        this._fileReader.onload = () => {
            this.filesProducer.filesControllerCreatePrivateFile({ file: this._file })
                .subscribe({
                    next: (file: FileDto) => {
                        this.control.setValue(file);
                    },
                    error: () => {
                        this.control.setValue(null);
                        this.control.setErrors({ message: "Загрузка не удалась" });
                    },
                    complete: () => {
                        this.control.markAsTouched();
                    }
                });
        };
    }
}
