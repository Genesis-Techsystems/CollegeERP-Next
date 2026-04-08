import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuModerationAnalysisReportComponent } from './jntu-moderation-analysis-report.component';

describe('JntuModerationAnalysisReportComponent', () => {
  let component: JntuModerationAnalysisReportComponent;
  let fixture: ComponentFixture<JntuModerationAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuModerationAnalysisReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuModerationAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
