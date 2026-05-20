import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReEvaluationBranchWiseResultAnalysisReportComponent } from './re-evaluation-branch-wise-result-analysis-report.component';

describe('ReEvaluationBranchWiseResultAnalysisReportComponent', () => {
  let component: ReEvaluationBranchWiseResultAnalysisReportComponent;
  let fixture: ComponentFixture<ReEvaluationBranchWiseResultAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReEvaluationBranchWiseResultAnalysisReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReEvaluationBranchWiseResultAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
