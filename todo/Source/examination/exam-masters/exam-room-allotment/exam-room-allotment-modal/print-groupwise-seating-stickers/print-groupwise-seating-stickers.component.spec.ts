import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintGroupwiseSeatingStickersComponent } from './print-groupwise-seating-stickers.component';

describe('PrintGroupwiseSeatingStickersComponent', () => {
  let component: PrintGroupwiseSeatingStickersComponent;
  let fixture: ComponentFixture<PrintGroupwiseSeatingStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintGroupwiseSeatingStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintGroupwiseSeatingStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
