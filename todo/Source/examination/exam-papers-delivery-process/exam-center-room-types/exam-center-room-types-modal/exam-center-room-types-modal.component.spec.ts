import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterRoomTypesModalComponent } from './exam-center-room-types-modal.component';

describe('ExamCenterRoomTypesModalComponent', () => {
  let component: ExamCenterRoomTypesModalComponent;
  let fixture: ComponentFixture<ExamCenterRoomTypesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterRoomTypesModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterRoomTypesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
