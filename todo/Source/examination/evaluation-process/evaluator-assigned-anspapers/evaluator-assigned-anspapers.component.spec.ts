import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluatorAssignedAnspapersComponent } from './evaluator-assigned-anspapers.component';

describe('EvaluatorAssignedAnspapersComponent', () => {
  let component: EvaluatorAssignedAnspapersComponent;
  let fixture: ComponentFixture<EvaluatorAssignedAnspapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluatorAssignedAnspapersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluatorAssignedAnspapersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
