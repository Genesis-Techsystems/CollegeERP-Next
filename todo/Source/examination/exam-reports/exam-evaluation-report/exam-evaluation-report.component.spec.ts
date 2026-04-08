import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamEvaluationReportComponent } from './exam-evaluation-report.component';

describe('ExamEvaluationReportComponent', () => {
  let component: ExamEvaluationReportComponent;
  let fixture: ComponentFixture<ExamEvaluationReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamEvaluationReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamEvaluationReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
