import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditUnivExamAnswerPaperBagsComponent } from './edit-univ-exam-answer-paper-bags.component';

describe('EditUnivExamAnswerPaperBagsComponent', () => {
  let component: EditUnivExamAnswerPaperBagsComponent;
  let fixture: ComponentFixture<EditUnivExamAnswerPaperBagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditUnivExamAnswerPaperBagsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditUnivExamAnswerPaperBagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
