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

    // TODO: Ад, переделать
    public pageList: Signal<number[]> = computed(() => {
        let pageList: number[] = [this.page()];

        while (
            this.pageList().length < PAGES_AROUND
            && (1 !== this.pageList()[0] || this.pageCount() !== this.pageList()[this.pageList().length - 1])) {
            if (1 !== this.pageList()[0]) {
                this.pageList().unshift(this.pageList()[0] - 1);
            }

            const last: number = [...this.pageList()].pop();

            if (this.pageCount() !== last) {
                this.pageList().push(last + 1);
            }
        }

        return pageList;
    });

    public goToPage(page: number): void {
        this.goToPageEvent.emit(page);
    }
}
