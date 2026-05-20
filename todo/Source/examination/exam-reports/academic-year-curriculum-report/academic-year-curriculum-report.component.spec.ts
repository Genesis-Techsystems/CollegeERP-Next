import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcademicYearCurriculumReportComponent } from './academic-year-curriculum-report.component';

describe('AcademicYearCurriculumReportComponent', () => {
  let component: AcademicYearCurriculumReportComponent;
  let fixture: ComponentFixture<AcademicYearCurriculumReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AcademicYearCurriculumReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AcademicYearCurriculumReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
