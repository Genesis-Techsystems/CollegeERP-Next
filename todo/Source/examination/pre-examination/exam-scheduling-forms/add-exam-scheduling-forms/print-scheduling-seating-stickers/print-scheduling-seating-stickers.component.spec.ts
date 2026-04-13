import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintSchedulingSeatingStickersComponent } from './print-scheduling-seating-stickers.component';

describe('PrintSchedulingSeatingStickersComponent', () => {
  let component: PrintSchedulingSeatingStickersComponent;
  let fixture: ComponentFixture<PrintSchedulingSeatingStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintSchedulingSeatingStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintSchedulingSeatingStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
