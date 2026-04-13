import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluatorSubjectsModalComponent } from './evaluator-subjects-modal.component';

describe('EvaluatorSubjectsModalComponent', () => {
  let component: EvaluatorSubjectsModalComponent;
  let fixture: ComponentFixture<EvaluatorSubjectsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluatorSubjectsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluatorSubjectsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
