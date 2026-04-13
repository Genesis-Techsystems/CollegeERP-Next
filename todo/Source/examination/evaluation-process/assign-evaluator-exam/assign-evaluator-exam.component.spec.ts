import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignEvaluatorExamComponent } from './assign-evaluator-exam.component';

describe('AssignEvaluatorExamComponent', () => {
  let component: AssignEvaluatorExamComponent;
  let fixture: ComponentFixture<AssignEvaluatorExamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignEvaluatorExamComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignEvaluatorExamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
