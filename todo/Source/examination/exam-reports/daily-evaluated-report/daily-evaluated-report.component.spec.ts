import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyEvaluatedReportComponent } from './daily-evaluated-report.component';

describe('DailyEvaluatedReportComponent', () => {
  let component: DailyEvaluatedReportComponent;
  let fixture: ComponentFixture<DailyEvaluatedReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DailyEvaluatedReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DailyEvaluatedReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
