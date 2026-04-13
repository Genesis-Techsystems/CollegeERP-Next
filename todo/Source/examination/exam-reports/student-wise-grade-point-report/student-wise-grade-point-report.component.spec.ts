import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentWiseGradePointReportComponent } from './student-wise-grade-point-report.component';

describe('StudentWiseGradePointReportComponent', () => {
  let component: StudentWiseGradePointReportComponent;
  let fixture: ComponentFixture<StudentWiseGradePointReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentWiseGradePointReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentWiseGradePointReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
