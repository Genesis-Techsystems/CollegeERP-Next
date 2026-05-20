import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectWiseResultPassPercentReportComponent } from './subject-wise-result-pass-percent-report.component';

describe('SubjectWiseResultPassPercentReportComponent', () => {
  let component: SubjectWiseResultPassPercentReportComponent;
  let fixture: ComponentFixture<SubjectWiseResultPassPercentReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubjectWiseResultPassPercentReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubjectWiseResultPassPercentReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
