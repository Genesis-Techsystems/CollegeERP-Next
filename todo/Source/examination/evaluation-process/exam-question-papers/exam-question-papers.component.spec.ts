import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamQuestionPapersComponent } from './exam-question-papers.component';

describe('ExamQuestionPapersComponent', () => {
  let component: ExamQuestionPapersComponent;
  let fixture: ComponentFixture<ExamQuestionPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamQuestionPapersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamQuestionPapersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
