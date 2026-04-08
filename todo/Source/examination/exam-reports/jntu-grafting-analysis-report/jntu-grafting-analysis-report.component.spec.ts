import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuGraftingAnalysisReportComponent } from './jntu-grafting-analysis-report.component';

describe('JntuGraftingAnalysisReportComponent', () => {
  let component: JntuGraftingAnalysisReportComponent;
  let fixture: ComponentFixture<JntuGraftingAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuGraftingAnalysisReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuGraftingAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
