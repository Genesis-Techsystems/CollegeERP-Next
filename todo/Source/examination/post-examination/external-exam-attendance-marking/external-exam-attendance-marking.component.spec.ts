import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalExamAttendanceMarkingComponent } from './external-exam-attendance-marking.component';

describe('ExternalExamAttendanceMarkingComponent', () => {
  let component: ExternalExamAttendanceMarkingComponent;
  let fixture: ComponentFixture<ExternalExamAttendanceMarkingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExternalExamAttendanceMarkingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExternalExamAttendanceMarkingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
