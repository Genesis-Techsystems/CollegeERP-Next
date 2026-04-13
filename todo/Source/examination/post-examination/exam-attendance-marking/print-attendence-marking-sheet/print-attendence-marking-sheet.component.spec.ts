import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintAttendenceMarkingSheetComponent } from './print-attendence-marking-sheet.component';

describe('PrintAttendenceMarkingSheetComponent', () => {
  let component: PrintAttendenceMarkingSheetComponent;
  let fixture: ComponentFixture<PrintAttendenceMarkingSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintAttendenceMarkingSheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintAttendenceMarkingSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
