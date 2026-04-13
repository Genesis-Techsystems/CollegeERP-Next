import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenderWiseExamReportComponent } from './gender-wise-exam-report.component';

describe('GenderWiseExamReportComponent', () => {
  let component: GenderWiseExamReportComponent;
  let fixture: ComponentFixture<GenderWiseExamReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GenderWiseExamReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GenderWiseExamReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
