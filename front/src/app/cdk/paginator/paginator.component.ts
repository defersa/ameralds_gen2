import { Component, ElementRef, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { AmstoreColor } from '../core/color';


const PAGES_AROUND: number = 4;

@Component({
    selector: 'amstore-paginator',
    templateUrl: './paginator.component.html',
    styleUrls: ['./paginator.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-paginator'
    }
})
export class AmstorePaginatorComponent extends AmstoreColor {
    @Input()
    public get page(): number {
        return this._page;
    }

    public set page(value: number) {
        this._page = value;
        this.setPageList();
    }

    public _page: number = 1;


    @Input()
    public get pageCount(): number {
        return this._pageCount;
    }

    public set pageCount(value: number) {
        this._pageCount = value;
        this.setPageList();
    }

    private _pageCount: number = 1;


    public pageList: number[] = [];

    @Output()
    public goToPageEvent: EventEmitter<number> = new EventEmitter<number>();

    constructor(public elementRef: ElementRef) {
        super(elementRef)
    }

    public goToPage(page: number): void {
        this.page = page;
        this.goToPageEvent.emit(page);
    }

    public setPageList(): void {
        this.pageList = [this.page];

        while (this.pageList.length < PAGES_AROUND
        && (1 !== this.pageList[0] || this.pageCount !== this.pageList[this.pageList.length - 1])) {
            if (1 !== this.pageList[0]) {
                this.pageList.unshift(this.pageList[0] - 1);
            }

            const last: number = [...this.pageList].pop();

            if (this.pageCount !== last) {
                this.pageList.push(last + 1);
            }
        }
    }
}
