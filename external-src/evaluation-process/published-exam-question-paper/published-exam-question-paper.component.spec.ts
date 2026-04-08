import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublishedExamQuestionPaperComponent } from './published-exam-question-paper.component';

describe('PublishedExamQuestionPaperComponent', () => {
  let component: PublishedExamQuestionPaperComponent;
  let fixture: ComponentFixture<PublishedExamQuestionPaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublishedExamQuestionPaperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublishedExamQuestionPaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
