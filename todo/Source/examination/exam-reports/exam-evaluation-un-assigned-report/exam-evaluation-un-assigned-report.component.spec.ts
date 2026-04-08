import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamEvaluationUnAssignedReportComponent } from './exam-evaluation-un-assigned-report.component';

describe('ExamEvaluationUnAssignedReportComponent', () => {
  let component: ExamEvaluationUnAssignedReportComponent;
  let fixture: ComponentFixture<ExamEvaluationUnAssignedReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamEvaluationUnAssignedReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamEvaluationUnAssignedReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
