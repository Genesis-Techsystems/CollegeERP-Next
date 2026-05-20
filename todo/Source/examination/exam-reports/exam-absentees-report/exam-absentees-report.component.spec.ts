import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamAbsenteesReportComponent } from './exam-absentees-report.component';

describe('ExamAbsenteesReportComponent', () => {
  let component: ExamAbsenteesReportComponent;
  let fixture: ComponentFixture<ExamAbsenteesReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamAbsenteesReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamAbsenteesReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
