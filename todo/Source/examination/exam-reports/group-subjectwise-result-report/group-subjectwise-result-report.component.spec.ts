import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupSubjectwiseResultReportComponent } from './group-subjectwise-result-report.component';

describe('GroupSubjectwiseResultReportComponent', () => {
  let component: GroupSubjectwiseResultReportComponent;
  let fixture: ComponentFixture<GroupSubjectwiseResultReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupSubjectwiseResultReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupSubjectwiseResultReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
