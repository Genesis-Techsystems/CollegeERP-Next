import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamQuestionGroupsComponent } from './exam-question-groups.component';

describe('ExamQuestionGroupsComponent', () => {
  let component: ExamQuestionGroupsComponent;
  let fixture: ComponentFixture<ExamQuestionGroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamQuestionGroupsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamQuestionGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
