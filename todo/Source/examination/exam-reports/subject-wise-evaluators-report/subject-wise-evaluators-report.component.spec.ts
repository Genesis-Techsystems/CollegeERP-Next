import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectWiseEvaluatorsReportComponent } from './subject-wise-evaluators-report.component';

describe('SubjectWiseEvaluatorsReportComponent', () => {
  let component: SubjectWiseEvaluatorsReportComponent;
  let fixture: ComponentFixture<SubjectWiseEvaluatorsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubjectWiseEvaluatorsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubjectWiseEvaluatorsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
