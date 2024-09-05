import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmstoreImageListEditorComponent } from './image-list-editor.component';

describe('ImageListEditorComponent', () => {
    let component: AmstoreImageListEditorComponent;
    let fixture: ComponentFixture<AmstoreImageListEditorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AmstoreImageListEditorComponent]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(AmstoreImageListEditorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
