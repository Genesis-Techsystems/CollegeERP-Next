import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamcenterProfilesReportComponent } from './examcenter-profiles-report.component';

describe('ExamcenterProfilesReportComponent', () => {
  let component: ExamcenterProfilesReportComponent;
  let fixture: ComponentFixture<ExamcenterProfilesReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamcenterProfilesReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamcenterProfilesReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
