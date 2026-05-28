import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintExamSeatnoStickersComponent } from './print-exam-seatno-stickers.component';

describe('PrintExamSeatnoStickersComponent', () => {
  let component: PrintExamSeatnoStickersComponent;
  let fixture: ComponentFixture<PrintExamSeatnoStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintExamSeatnoStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintExamSeatnoStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
