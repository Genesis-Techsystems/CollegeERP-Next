import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamStdAnswerPaperpagesComponent } from './exam-std-answer-paperpages.component';

describe('ExamStdAnswerPaperpagesComponent', () => {
  let component: ExamStdAnswerPaperpagesComponent;
  let fixture: ComponentFixture<ExamStdAnswerPaperpagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamStdAnswerPaperpagesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamStdAnswerPaperpagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
