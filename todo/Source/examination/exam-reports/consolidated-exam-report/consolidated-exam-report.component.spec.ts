import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsolidatedExamReportComponent } from './consolidated-exam-report.component';

describe('ConsolidatedExamReportComponent', () => {
  let component: ConsolidatedExamReportComponent;
  let fixture: ComponentFixture<ConsolidatedExamReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConsolidatedExamReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsolidatedExamReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
