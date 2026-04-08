import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReevaluationStudentsReportComponent } from './reevaluation-students-report.component';

describe('ReevaluationStudentsReportComponent', () => {
  let component: ReevaluationStudentsReportComponent;
  let fixture: ComponentFixture<ReevaluationStudentsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReevaluationStudentsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReevaluationStudentsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
