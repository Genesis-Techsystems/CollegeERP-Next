import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamCenterRoomsComponent } from './univ-exam-center-rooms.component';

describe('UnivExamCenterRoomsComponent', () => {
  let component: UnivExamCenterRoomsComponent;
  let fixture: ComponentFixture<UnivExamCenterRoomsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamCenterRoomsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamCenterRoomsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
