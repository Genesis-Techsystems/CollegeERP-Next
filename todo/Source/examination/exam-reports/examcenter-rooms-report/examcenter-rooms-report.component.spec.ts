import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamcenterRoomsReportComponent } from './examcenter-rooms-report.component';

describe('ExamcenterRoomsReportComponent', () => {
  let component: ExamcenterRoomsReportComponent;
  let fixture: ComponentFixture<ExamcenterRoomsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamcenterRoomsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamcenterRoomsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
