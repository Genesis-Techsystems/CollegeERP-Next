import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamAnswerPaperBagsComponent } from './univ-exam-answer-paper-bags.component';

describe('UnivExamAnswerPaperBagsComponent', () => {
  let component: UnivExamAnswerPaperBagsComponent;
  let fixture: ComponentFixture<UnivExamAnswerPaperBagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamAnswerPaperBagsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamAnswerPaperBagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
