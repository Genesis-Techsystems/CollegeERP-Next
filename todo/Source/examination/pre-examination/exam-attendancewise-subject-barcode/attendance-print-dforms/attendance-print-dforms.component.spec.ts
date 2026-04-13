import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendancePrintDformsComponent } from './attendance-print-dforms.component';

describe('AttendancePrintDformsComponent', () => {
  let component: AttendancePrintDformsComponent;
  let fixture: ComponentFixture<AttendancePrintDformsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AttendancePrintDformsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AttendancePrintDformsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
