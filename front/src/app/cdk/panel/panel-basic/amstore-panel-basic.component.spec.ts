import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmstorePanelBasicComponent } from './amstore-panel-basic.component';

describe('PanelBasicComponent', () => {
  let component: AmstorePanelBasicComponent;
  let fixture: ComponentFixture<AmstorePanelBasicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AmstorePanelBasicComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AmstorePanelBasicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
