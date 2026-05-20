import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterRoomAllotmentModalComponent } from './exam-center-room-allotment-modal.component';

describe('ExamCenterRoomAllotmentModalComponent', () => {
  let component: ExamCenterRoomAllotmentModalComponent;
  let fixture: ComponentFixture<ExamCenterRoomAllotmentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterRoomAllotmentModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterRoomAllotmentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
