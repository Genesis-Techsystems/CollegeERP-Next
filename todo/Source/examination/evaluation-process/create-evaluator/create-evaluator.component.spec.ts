import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateEvaluatorComponent } from './create-evaluator.component';

describe('CreateEvaluatorComponent', () => {
  let component: CreateEvaluatorComponent;
  let fixture: ComponentFixture<CreateEvaluatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateEvaluatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateEvaluatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
