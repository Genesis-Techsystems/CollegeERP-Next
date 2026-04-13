import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffInternalAttendanceMarkingComponent } from './staff-internal-attendance-marking.component';

describe('StaffInternalAttendanceMarkingComponent', () => {
  let component: StaffInternalAttendanceMarkingComponent;
  let fixture: ComponentFixture<StaffInternalAttendanceMarkingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StaffInternalAttendanceMarkingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StaffInternalAttendanceMarkingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
