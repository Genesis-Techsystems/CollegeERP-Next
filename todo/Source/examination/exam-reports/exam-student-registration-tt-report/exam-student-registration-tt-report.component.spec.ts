import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamStudentRegistrationTtReportComponent } from './exam-student-registration-tt-report.component';

describe('ExamStudentRegistrationTtReportComponent', () => {
  let component: ExamStudentRegistrationTtReportComponent;
  let fixture: ComponentFixture<ExamStudentRegistrationTtReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamStudentRegistrationTtReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamStudentRegistrationTtReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
