import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupYearwiseResultReportComponent } from './group-yearwise-result-report.component';

describe('GroupYearwiseResultReportComponent', () => {
  let component: GroupYearwiseResultReportComponent;
  let fixture: ComponentFixture<GroupYearwiseResultReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupYearwiseResultReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupYearwiseResultReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
