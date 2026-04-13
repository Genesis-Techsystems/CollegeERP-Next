import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignReEvaluatorComponent } from './assign-re-evaluator.component';

describe('AssignReEvaluatorComponent', () => {
  let component: AssignReEvaluatorComponent;
  let fixture: ComponentFixture<AssignReEvaluatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignReEvaluatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignReEvaluatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
