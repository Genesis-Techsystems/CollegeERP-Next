import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamStudentEvaluationPageComponent } from './exam-student-evaluation-page.component';

describe('ExamStudentEvaluationPageComponent', () => {
  let component: ExamStudentEvaluationPageComponent;
  let fixture: ComponentFixture<ExamStudentEvaluationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamStudentEvaluationPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamStudentEvaluationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
