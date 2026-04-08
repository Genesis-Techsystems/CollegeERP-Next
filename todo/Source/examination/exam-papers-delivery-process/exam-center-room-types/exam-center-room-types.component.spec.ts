import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterRoomTypesComponent } from './exam-center-room-types.component';

describe('ExamCenterRoomTypesComponent', () => {
  let component: ExamCenterRoomTypesComponent;
  let fixture: ComponentFixture<ExamCenterRoomTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterRoomTypesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterRoomTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
