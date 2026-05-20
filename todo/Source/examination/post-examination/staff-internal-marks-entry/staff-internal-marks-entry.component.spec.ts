import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffInternalMarksEntryComponent } from './staff-internal-marks-entry.component';

describe('StaffInternalMarksEntryComponent', () => {
  let component: StaffInternalMarksEntryComponent;
  let fixture: ComponentFixture<StaffInternalMarksEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StaffInternalMarksEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StaffInternalMarksEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
