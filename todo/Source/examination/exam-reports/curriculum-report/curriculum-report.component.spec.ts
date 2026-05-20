import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumReportComponent } from './curriculum-report.component';

describe('CurriculumReportComponent', () => {
  let component: CurriculumReportComponent;
  let fixture: ComponentFixture<CurriculumReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
