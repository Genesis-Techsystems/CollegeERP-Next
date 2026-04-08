import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModerationBenefitedStudentsReportComponent } from './moderation-benefited-students-report.component';

describe('ModerationBenefitedStudentsReportComponent', () => {
  let component: ModerationBenefitedStudentsReportComponent;
  let fixture: ComponentFixture<ModerationBenefitedStudentsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModerationBenefitedStudentsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModerationBenefitedStudentsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
