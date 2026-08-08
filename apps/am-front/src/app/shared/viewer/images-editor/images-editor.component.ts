import {
    Component,
    ElementRef,
    inject,
    OnInit, signal,
    Signal,
    viewChild,
    WritableSignal,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogRef, MatDialogTitle } from "@angular/material/dialog";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { ImageDto, ApiImagesProducer } from "@am-front/root/api-v2";


@Component({
    selector: "amstore-images-editor",
    templateUrl: "./images-editor.component.html",
    styleUrls: ["./images-editor.component.scss"],
    standalone: true,
    imports: [
        MatDialogTitle,
        IconsComponent,
        AmstoreButtonComponent,
        MatDialogActions
    ],
    host: {
        "class": "amstore-image-list-editor"
    }
})
export class AmstoreImagesEditorComponent implements OnInit {
    private imageInputRef: Signal<ElementRef> = viewChild('imageInput');

    private data: { images: ImageDto[] } = inject(MAT_DIALOG_DATA);
    private imagesProducer: ApiImagesProducer = inject(ApiImagesProducer);
    private dialogRef: MatDialogRef<AmstoreImagesEditorComponent> = inject(MatDialogRef<AmstoreImagesEditorComponent>);

    public images: WritableSignal<ImageDto[]> = signal(this.data.images);

    private _fileReader: FileReader = new FileReader();
    private _file: globalThis.File = null;

    public ngOnInit(): void {
        this._initFileReader();
    }

    public dropFiles(fileList: EventTarget | null): void {
        const files: FileList | null = fileList ? (fileList as HTMLInputElement).files : null;
        const file: globalThis.File | null | undefined = files ? files.item(0) : undefined;

        if (file) {
            this._file = file;
            this._fileReader.readAsDataURL(file as unknown as Blob);
        }
    }

    public moveImage(index: number, direction: 'next' | 'prev'): void {
        let nextIndex: number = index + (direction === 'next' ? 1 : -1);

        if (nextIndex > this.images().length - 1) {
            nextIndex = this.images().length - 1;
        }

        if (nextIndex < 0) {
            nextIndex = 0;
        }

        const newImagesSet: ImageDto[] = [...this.images()];

        [newImagesSet[index], newImagesSet[nextIndex]] = [newImagesSet[nextIndex], newImagesSet[index]];

        this.images.set(newImagesSet);
    }

    public remove(index: number): void {
        this.images.set(
            this.images().filter((item: ImageDto, i: number) => i !== index),
        );
    }

    public callInputDialog(): void {
        this.imageInputRef().nativeElement.click();
    }

    public close(save?: boolean): void {
        this.dialogRef.close(save ? this.images() : null);
    }

    private _initFileReader(): void {
        this._fileReader.onload = () => {
            this.imagesProducer.imagesControllerCreate(this._file)
                .subscribe((image: ImageDto) => this.images.set([...this.images(), image]));
        }
    }
}
