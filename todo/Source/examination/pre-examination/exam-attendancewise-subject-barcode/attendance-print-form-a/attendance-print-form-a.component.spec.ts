import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendancePrintFormAComponent } from './attendance-print-form-a.component';

describe('AttendancePrintFormAComponent', () => {
  let component: AttendancePrintFormAComponent;
  let fixture: ComponentFixture<AttendancePrintFormAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AttendancePrintFormAComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AttendancePrintFormAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
