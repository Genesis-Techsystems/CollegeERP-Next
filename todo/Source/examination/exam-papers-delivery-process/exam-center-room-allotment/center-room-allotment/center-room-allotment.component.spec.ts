import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CenterRoomAllotmentComponent } from './center-room-allotment.component';

describe('CenterRoomAllotmentComponent', () => {
  let component: CenterRoomAllotmentComponent;
  let fixture: ComponentFixture<CenterRoomAllotmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CenterRoomAllotmentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CenterRoomAllotmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
