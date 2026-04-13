import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignEvaluatorSubjectrolesComponent } from './assign-evaluator-subjectroles.component';

describe('AssignEvaluatorSubjectrolesComponent', () => {
  let component: AssignEvaluatorSubjectrolesComponent;
  let fixture: ComponentFixture<AssignEvaluatorSubjectrolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignEvaluatorSubjectrolesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignEvaluatorSubjectrolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
