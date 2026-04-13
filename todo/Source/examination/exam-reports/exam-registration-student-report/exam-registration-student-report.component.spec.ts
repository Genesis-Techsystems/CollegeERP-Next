import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamRegistrationStudentReportComponent } from './exam-registration-student-report.component';

describe('ExamRegistrationStudentReportComponent', () => {
  let component: ExamRegistrationStudentReportComponent;
  let fixture: ComponentFixture<ExamRegistrationStudentReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamRegistrationStudentReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamRegistrationStudentReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
