import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuResultAnalysisReportComponent } from './jntu-result-analysis-report.component';

describe('JntuResultAnalysisReportComponent', () => {
  let component: JntuResultAnalysisReportComponent;
  let fixture: ComponentFixture<JntuResultAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuResultAnalysisReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuResultAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
