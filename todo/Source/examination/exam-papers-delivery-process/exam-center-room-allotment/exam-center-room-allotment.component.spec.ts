import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterRoomAllotmentComponent } from './exam-center-room-allotment.component';

describe('ExamCenterRoomAllotmentComponent', () => {
  let component: ExamCenterRoomAllotmentComponent;
  let fixture: ComponentFixture<ExamCenterRoomAllotmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterRoomAllotmentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterRoomAllotmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
