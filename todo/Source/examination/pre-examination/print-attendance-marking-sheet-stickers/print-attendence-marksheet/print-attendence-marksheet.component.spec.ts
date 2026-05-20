import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintAttendenceMarksheetComponent } from './print-attendence-marksheet.component';

describe('PrintAttendenceMarksheetComponent', () => {
  let component: PrintAttendenceMarksheetComponent;
  let fixture: ComponentFixture<PrintAttendenceMarksheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintAttendenceMarksheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintAttendenceMarksheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
