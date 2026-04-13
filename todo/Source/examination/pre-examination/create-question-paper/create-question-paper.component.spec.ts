import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateQuestionPaperComponent } from './create-question-paper.component';

describe('CreateQuestionPaperComponent', () => {
  let component: CreateQuestionPaperComponent;
  let fixture: ComponentFixture<CreateQuestionPaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateQuestionPaperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateQuestionPaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
