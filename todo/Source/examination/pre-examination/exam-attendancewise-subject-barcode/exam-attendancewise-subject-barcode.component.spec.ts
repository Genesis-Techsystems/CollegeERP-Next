import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamAttendancewiseSubjectBarcodeComponent } from './exam-attendancewise-subject-barcode.component';

describe('ExamAttendancewiseSubjectBarcodeComponent', () => {
  let component: ExamAttendancewiseSubjectBarcodeComponent;
  let fixture: ComponentFixture<ExamAttendancewiseSubjectBarcodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamAttendancewiseSubjectBarcodeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamAttendancewiseSubjectBarcodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
