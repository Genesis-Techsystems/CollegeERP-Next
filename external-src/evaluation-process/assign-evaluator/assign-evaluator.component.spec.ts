import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignEvaluatorComponent } from './assign-evaluator.component';

describe('AssignEvaluatorComponent', () => {
  let component: AssignEvaluatorComponent;
  let fixture: ComponentFixture<AssignEvaluatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignEvaluatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignEvaluatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
