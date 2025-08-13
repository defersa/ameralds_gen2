import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatternCartShortComponent } from './pattern-cart-short.component';

describe('PatternCartShortComponent', () => {
  let component: PatternCartShortComponent;
  let fixture: ComponentFixture<PatternCartShortComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatternCartShortComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatternCartShortComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
