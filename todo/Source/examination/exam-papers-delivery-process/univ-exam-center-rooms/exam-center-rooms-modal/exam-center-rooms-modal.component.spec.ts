import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterRoomsModalComponent } from './exam-center-rooms-modal.component';

describe('ExamCenterRoomsModalComponent', () => {
  let component: ExamCenterRoomsModalComponent;
  let fixture: ComponentFixture<ExamCenterRoomsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterRoomsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterRoomsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
