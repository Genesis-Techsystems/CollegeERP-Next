import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectwiseResultReportComponent } from './subjectwise-result-report.component';

describe('SubjectwiseResultReportComponent', () => {
  let component: SubjectwiseResultReportComponent;
  let fixture: ComponentFixture<SubjectwiseResultReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubjectwiseResultReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubjectwiseResultReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
