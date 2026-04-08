import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReEvaluationResultReportComponent } from './re-evaluation-result-report.component';

describe('ReEvaluationResultReportComponent', () => {
  let component: ReEvaluationResultReportComponent;
  let fixture: ComponentFixture<ReEvaluationResultReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReEvaluationResultReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReEvaluationResultReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
