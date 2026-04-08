import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignQuestionTemplateNewComponent } from './assign-question-template-new.component';

describe('AssignQuestionTemplateNewComponent', () => {
  let component: AssignQuestionTemplateNewComponent;
  let fixture: ComponentFixture<AssignQuestionTemplateNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignQuestionTemplateNewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignQuestionTemplateNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
