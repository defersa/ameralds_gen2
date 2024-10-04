import {
    Component,
    computed,
    input,
    InputSignal,
    output,
    OutputEmitterRef,
    Signal,
} from "@angular/core";
import { AmstoreColor } from "../core/color";
import { IconsComponent } from "@am/cdk/icons/icons.component";


const PAGES_AROUND: number = 4;

@Component({
    selector: "amstore-paginator",
    templateUrl: "./paginator.component.html",
    styleUrls: ["./paginator.component.scss"],
    standalone: true,
    imports: [
        IconsComponent
    ],
    host: {
        class: "amstore-paginator"
    }
})
export class AmstorePaginatorComponent extends AmstoreColor {
    public page: InputSignal<number> = input(1);
    public pageCount: InputSignal<number> = input(1);

    public goToPageEvent: OutputEmitterRef<number> = output<number>();

    public pageList: Signal<number[]> = computed(() => {
        const startPosition: number = this.page() - PAGES_AROUND < 1 ? 1 : this.page() - PAGES_AROUND;
        const endPosition: number = this.page() + PAGES_AROUND > this.pageCount() ? this.pageCount() : this.page() + PAGES_AROUND;

        // TODO: Add logic to increase when corner

        return Array.from({ length: endPosition - startPosition + 1 }).map((item: unknown, index: number) => startPosition + index);
    });

    public goToPage(page: number): void {
        this.goToPageEvent.emit(page);
    }
}
