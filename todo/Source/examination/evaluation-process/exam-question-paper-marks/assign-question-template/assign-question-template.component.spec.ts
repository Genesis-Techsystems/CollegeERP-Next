import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignQuestionTemplateComponent } from './assign-question-template.component';

describe('AssignQuestionTemplateComponent', () => {
  let component: AssignQuestionTemplateComponent;
  let fixture: ComponentFixture<AssignQuestionTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignQuestionTemplateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignQuestionTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
