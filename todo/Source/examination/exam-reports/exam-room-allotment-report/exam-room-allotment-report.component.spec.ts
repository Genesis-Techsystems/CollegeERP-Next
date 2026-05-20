import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamRoomAllotmentReportComponent } from './exam-room-allotment-report.component';

describe('ExamRoomAllotmentReportComponent', () => {
  let component: ExamRoomAllotmentReportComponent;
  let fixture: ComponentFixture<ExamRoomAllotmentReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamRoomAllotmentReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamRoomAllotmentReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
