import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JewelryCardComponent } from './jewelry-card.component';

describe('JewelryCardComponent', () => {
  let component: JewelryCardComponent;
  let fixture: ComponentFixture<JewelryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JewelryCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JewelryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
