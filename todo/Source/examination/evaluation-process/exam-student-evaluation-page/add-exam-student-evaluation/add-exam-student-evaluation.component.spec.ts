import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamStudentEvaluationComponent } from './add-exam-student-evaluation.component';

describe('AddExamStudentEvaluationComponent', () => {
  let component: AddExamStudentEvaluationComponent;
  let fixture: ComponentFixture<AddExamStudentEvaluationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExamStudentEvaluationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExamStudentEvaluationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
