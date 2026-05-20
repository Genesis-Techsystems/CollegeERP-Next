import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateEvaluatorAnswerPapersStatusComponent } from './update-evaluator-answer-papers-status.component';

describe('UpdateEvaluatorAnswerPapersStatusComponent', () => {
  let component: UpdateEvaluatorAnswerPapersStatusComponent;
  let fixture: ComponentFixture<UpdateEvaluatorAnswerPapersStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpdateEvaluatorAnswerPapersStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateEvaluatorAnswerPapersStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
