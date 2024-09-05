import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoodsSnapComponent } from './goods-snap.component';

describe('GoodsComponent', () => {
    let component: GoodsSnapComponent;
    let fixture: ComponentFixture<GoodsSnapComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [GoodsSnapComponent]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(GoodsSnapComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
