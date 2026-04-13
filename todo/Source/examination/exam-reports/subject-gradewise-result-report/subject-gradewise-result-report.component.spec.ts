import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectGradewiseResultReportComponent } from './subject-gradewise-result-report.component';

describe('SubjectGradewiseResultReportComponent', () => {
  let component: SubjectGradewiseResultReportComponent;
  let fixture: ComponentFixture<SubjectGradewiseResultReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubjectGradewiseResultReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubjectGradewiseResultReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
