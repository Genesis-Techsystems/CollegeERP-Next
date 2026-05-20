import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReEvaluationResultComparisionReportComponent } from './re-evaluation-result-comparision-report.component';

describe('ReEvaluationResultComparisionReportComponent', () => {
  let component: ReEvaluationResultComparisionReportComponent;
  let fixture: ComponentFixture<ReEvaluationResultComparisionReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReEvaluationResultComparisionReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReEvaluationResultComparisionReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
