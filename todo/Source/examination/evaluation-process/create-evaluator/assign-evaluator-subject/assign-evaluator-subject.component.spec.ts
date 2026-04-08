import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignEvaluatorSubjectComponent } from './assign-evaluator-subject.component';

describe('AssignEvaluatorSubjectComponent', () => {
  let component: AssignEvaluatorSubjectComponent;
  let fixture: ComponentFixture<AssignEvaluatorSubjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignEvaluatorSubjectComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignEvaluatorSubjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
