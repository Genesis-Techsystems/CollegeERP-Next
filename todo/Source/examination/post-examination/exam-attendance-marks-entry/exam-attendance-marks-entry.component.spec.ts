import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamAttendanceMarksEntryComponent } from './exam-attendance-marks-entry.component';

describe('ExamAttendanceMarksEntryComponent', () => {
  let component: ExamAttendanceMarksEntryComponent;
  let fixture: ComponentFixture<ExamAttendanceMarksEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamAttendanceMarksEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamAttendanceMarksEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
