import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamQuestionPaperMarksModelComponent } from './add-exam-question-paper-marks-model.component';

describe('AddExamQuestionPaperMarksModelComponent', () => {
  let component: AddExamQuestionPaperMarksModelComponent;
  let fixture: ComponentFixture<AddExamQuestionPaperMarksModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExamQuestionPaperMarksModelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExamQuestionPaperMarksModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
