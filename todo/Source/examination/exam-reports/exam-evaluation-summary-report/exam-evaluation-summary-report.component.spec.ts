import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamEvaluationSummaryReportComponent } from './exam-evaluation-summary-report.component';

describe('ExamEvaluationSummaryReportComponent', () => {
  let component: ExamEvaluationSummaryReportComponent;
  let fixture: ComponentFixture<ExamEvaluationSummaryReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamEvaluationSummaryReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamEvaluationSummaryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
