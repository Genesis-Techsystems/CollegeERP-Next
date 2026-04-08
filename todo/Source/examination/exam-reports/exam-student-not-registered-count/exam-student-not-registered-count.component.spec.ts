import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamStudentNotRegisteredCountComponent } from './exam-student-not-registered-count.component';

describe('ExamStudentNotRegisteredCountComponent', () => {
  let component: ExamStudentNotRegisteredCountComponent;
  let fixture: ComponentFixture<ExamStudentNotRegisteredCountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamStudentNotRegisteredCountComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamStudentNotRegisteredCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
