import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewTemplateQuestionsComponent } from './view-template-questions.component';

describe('ViewTemplateQuestionsComponent', () => {
  let component: ViewTemplateQuestionsComponent;
  let fixture: ComponentFixture<ViewTemplateQuestionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewTemplateQuestionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewTemplateQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
