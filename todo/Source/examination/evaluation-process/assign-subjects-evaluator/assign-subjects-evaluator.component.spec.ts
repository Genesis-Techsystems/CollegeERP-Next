import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignSubjectsEvaluatorComponent } from './assign-subjects-evaluator.component';

describe('AssignSubjectsEvaluatorComponent', () => {
  let component: AssignSubjectsEvaluatorComponent;
  let fixture: ComponentFixture<AssignSubjectsEvaluatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignSubjectsEvaluatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignSubjectsEvaluatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
