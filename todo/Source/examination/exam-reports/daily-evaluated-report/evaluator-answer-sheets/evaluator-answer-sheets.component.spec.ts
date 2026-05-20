import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluatorAnswerSheetsComponent } from './evaluator-answer-sheets.component';

describe('EvaluatorAnswerSheetsComponent', () => {
  let component: EvaluatorAnswerSheetsComponent;
  let fixture: ComponentFixture<EvaluatorAnswerSheetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluatorAnswerSheetsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluatorAnswerSheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
