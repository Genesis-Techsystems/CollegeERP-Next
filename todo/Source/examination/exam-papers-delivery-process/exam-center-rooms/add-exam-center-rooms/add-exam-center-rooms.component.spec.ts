import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamCenterRoomsComponent } from './add-exam-center-rooms.component';

describe('AddExamCenterRoomsComponent', () => {
  let component: AddExamCenterRoomsComponent;
  let fixture: ComponentFixture<AddExamCenterRoomsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExamCenterRoomsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExamCenterRoomsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
