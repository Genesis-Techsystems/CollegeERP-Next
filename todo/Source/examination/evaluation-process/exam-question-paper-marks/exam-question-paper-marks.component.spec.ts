import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamQuestionPaperMarksComponent } from './exam-question-paper-marks.component';

describe('ExamQuestionPaperMarksComponent', () => {
  let component: ExamQuestionPaperMarksComponent;
  let fixture: ComponentFixture<ExamQuestionPaperMarksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamQuestionPaperMarksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamQuestionPaperMarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
