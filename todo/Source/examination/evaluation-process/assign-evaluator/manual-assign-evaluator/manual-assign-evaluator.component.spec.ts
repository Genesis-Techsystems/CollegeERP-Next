import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualAssignEvaluatorComponent } from './manual-assign-evaluator.component';

describe('ManualAssignEvaluatorComponent', () => {
  let component: ManualAssignEvaluatorComponent;
  let fixture: ComponentFixture<ManualAssignEvaluatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManualAssignEvaluatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManualAssignEvaluatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
