import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamFinalQuestionPaperComponent } from './exam-final-question-paper.component';

describe('ExamFinalQuestionPaperComponent', () => {
  let component: ExamFinalQuestionPaperComponent;
  let fixture: ComponentFixture<ExamFinalQuestionPaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamFinalQuestionPaperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamFinalQuestionPaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
