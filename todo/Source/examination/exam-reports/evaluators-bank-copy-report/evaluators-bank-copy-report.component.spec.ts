import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluatorsBankCopyReportComponent } from './evaluators-bank-copy-report.component';

describe('EvaluatorsBankCopyReportComponent', () => {
  let component: EvaluatorsBankCopyReportComponent;
  let fixture: ComponentFixture<EvaluatorsBankCopyReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluatorsBankCopyReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluatorsBankCopyReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
