import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintAttendanceMarkingSheetStickersComponent } from './print-attendance-marking-sheet-stickers.component';

describe('PrintAttendanceMarkingSheetStickersComponent', () => {
  let component: PrintAttendanceMarkingSheetStickersComponent;
  let fixture: ComponentFixture<PrintAttendanceMarkingSheetStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintAttendanceMarkingSheetStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintAttendanceMarkingSheetStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
