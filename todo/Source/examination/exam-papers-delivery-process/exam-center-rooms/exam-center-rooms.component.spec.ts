import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterRoomsComponent } from './exam-center-rooms.component';

describe('ExamCenterRoomsComponent', () => {
  let component: ExamCenterRoomsComponent;
  let fixture: ComponentFixture<ExamCenterRoomsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterRoomsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterRoomsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
