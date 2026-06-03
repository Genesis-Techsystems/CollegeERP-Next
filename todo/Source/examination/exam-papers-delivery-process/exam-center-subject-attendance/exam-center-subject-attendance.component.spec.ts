import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterSubjectAttendanceComponent } from './exam-center-subject-attendance.component';

describe('ExamCenterSubjectAttendanceComponent', () => {
  let component: ExamCenterSubjectAttendanceComponent;
  let fixture: ComponentFixture<ExamCenterSubjectAttendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterSubjectAttendanceComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterSubjectAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
