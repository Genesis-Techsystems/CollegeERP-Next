import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamSeatnoBarcodesComponent } from './exam-seatno-barcodes.component';

describe('ExamSeatnoBarcodesComponent', () => {
  let component: ExamSeatnoBarcodesComponent;
  let fixture: ComponentFixture<ExamSeatnoBarcodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamSeatnoBarcodesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamSeatnoBarcodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
