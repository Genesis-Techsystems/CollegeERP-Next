import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluatedMarksReportComponent } from './evaluated-marks-report.component';

describe('EvaluatedMarksReportComponent', () => {
  let component: EvaluatedMarksReportComponent;
  let fixture: ComponentFixture<EvaluatedMarksReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluatedMarksReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluatedMarksReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
