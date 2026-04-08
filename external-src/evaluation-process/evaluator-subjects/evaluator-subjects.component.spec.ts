import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluatorSubjectsComponent } from './evaluator-subjects.component';

describe('EvaluatorSubjectsComponent', () => {
  let component: EvaluatorSubjectsComponent;
  let fixture: ComponentFixture<EvaluatorSubjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluatorSubjectsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluatorSubjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
