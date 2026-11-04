import { FIRST_PAGE } from "@ameralds/utils";
import { Component, computed, input, InputSignal, output, OutputEmitterRef, Signal } from "@angular/core";
import { AmstoreColor } from "../core/color";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";


const PAGES_AROUND: number = 4;

@Component({
	selector: "amstore-paginator",
	templateUrl: "./paginator.component.html",
	styleUrls: ["./paginator.component.scss"],
	imports: [IconsComponent],
	host: {
		class: "amstore-paginator",
	},
})
export class AmstorePaginatorComponent extends AmstoreColor {
	public page: InputSignal<number> = input(FIRST_PAGE);
	public pageCount: InputSignal<number> = input(1);

	public goToPageEvent: OutputEmitterRef<number> = output<number>();

	protected readonly firstPage = FIRST_PAGE;

	public pageList: Signal<number[]> = computed(() => {
		const startPosition: number = this.page() - PAGES_AROUND < FIRST_PAGE ? FIRST_PAGE : this.page() - PAGES_AROUND;

		const endPosition: number =
			this.page() + PAGES_AROUND > this.pageCount() ? this.pageCount() : this.page() + PAGES_AROUND;

		// TODO: Add logic to increase when corner

		return Array.from({
			length: endPosition - startPosition + 1,
		})
			.map((item: unknown, index: number) => startPosition + index);
	});

	/**
	 * Уведомляет родительский компонент о выборе страницы; состояние входного сигнала самостоятельно не
	 * изменяет.
	 */
	public goToPage(page: number): void {
		this.goToPageEvent.emit(page);
	}
}
