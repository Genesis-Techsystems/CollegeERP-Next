import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamQuestionPaperMarksNewComponent } from './exam-question-paper-marks-new.component';

describe('ExamQuestionPaperMarksNewComponent', () => {
  let component: ExamQuestionPaperMarksNewComponent;
  let fixture: ComponentFixture<ExamQuestionPaperMarksNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamQuestionPaperMarksNewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamQuestionPaperMarksNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
