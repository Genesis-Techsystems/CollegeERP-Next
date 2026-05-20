import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsolidatedMarksReportComponent } from './consolidated-marks-report.component';

describe('ConsolidatedMarksReportComponent', () => {
  let component: ConsolidatedMarksReportComponent;
  let fixture: ComponentFixture<ConsolidatedMarksReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConsolidatedMarksReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsolidatedMarksReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
