import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiEvaluatorAssignComponent } from './multi-evaluator-assign.component';

describe('MultiEvaluatorAssignComponent', () => {
  let component: MultiEvaluatorAssignComponent;
  let fixture: ComponentFixture<MultiEvaluatorAssignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MultiEvaluatorAssignComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiEvaluatorAssignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
