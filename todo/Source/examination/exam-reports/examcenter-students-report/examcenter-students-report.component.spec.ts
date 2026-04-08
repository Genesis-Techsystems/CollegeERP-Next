import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamcenterStudentsReportComponent } from './examcenter-students-report.component';

describe('ExamcenterStudentsReportComponent', () => {
  let component: ExamcenterStudentsReportComponent;
  let fixture: ComponentFixture<ExamcenterStudentsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamcenterStudentsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamcenterStudentsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
