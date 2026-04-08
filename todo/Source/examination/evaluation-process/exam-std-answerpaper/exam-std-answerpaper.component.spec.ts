import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamStdAnswerpaperComponent } from './exam-std-answerpaper.component';

describe('ExamStdAnswerpaperComponent', () => {
  let component: ExamStdAnswerpaperComponent;
  let fixture: ComponentFixture<ExamStdAnswerpaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamStdAnswerpaperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamStdAnswerpaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
