import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraceBenefitedStudentsReportComponent } from './grace-benefited-students-report.component';

describe('GraceBenefitedStudentsReportComponent', () => {
  let component: GraceBenefitedStudentsReportComponent;
  let fixture: ComponentFixture<GraceBenefitedStudentsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GraceBenefitedStudentsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GraceBenefitedStudentsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
