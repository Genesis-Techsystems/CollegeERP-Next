import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamAnswerSheetsReportComponent } from './exam-answer-sheets-report.component';

describe('ExamAnswerSheetsReportComponent', () => {
  let component: ExamAnswerSheetsReportComponent;
  let fixture: ComponentFixture<ExamAnswerSheetsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamAnswerSheetsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamAnswerSheetsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
