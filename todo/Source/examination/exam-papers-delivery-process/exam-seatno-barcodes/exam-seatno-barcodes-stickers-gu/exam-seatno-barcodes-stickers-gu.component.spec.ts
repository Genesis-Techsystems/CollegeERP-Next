import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamSeatnoBarcodesStickersGuComponent } from './exam-seatno-barcodes-stickers-gu.component';

describe('ExamSeatnoBarcodesStickersGuComponent', () => {
  let component: ExamSeatnoBarcodesStickersGuComponent;
  let fixture: ComponentFixture<ExamSeatnoBarcodesStickersGuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamSeatnoBarcodesStickersGuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamSeatnoBarcodesStickersGuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
