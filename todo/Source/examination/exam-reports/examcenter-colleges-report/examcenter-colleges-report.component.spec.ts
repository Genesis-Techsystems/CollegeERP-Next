import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamcenterCollegesReportComponent } from './examcenter-colleges-report.component';

describe('ExamcenterCollegesReportComponent', () => {
  let component: ExamcenterCollegesReportComponent;
  let fixture: ComponentFixture<ExamcenterCollegesReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamcenterCollegesReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamcenterCollegesReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
