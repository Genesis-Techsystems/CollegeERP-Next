import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamcenterAnswerpaperBagsReportComponent } from './examcenter-answerpaper-bags-report.component';

describe('ExamcenterAnswerpaperBagsReportComponent', () => {
  let component: ExamcenterAnswerpaperBagsReportComponent;
  let fixture: ComponentFixture<ExamcenterAnswerpaperBagsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamcenterAnswerpaperBagsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamcenterAnswerpaperBagsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
