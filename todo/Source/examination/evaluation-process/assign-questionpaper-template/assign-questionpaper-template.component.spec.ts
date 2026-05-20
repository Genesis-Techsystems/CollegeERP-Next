import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignQuestionpaperTemplateComponent } from './assign-questionpaper-template.component';

describe('AssignQuestionpaperTemplateComponent', () => {
  let component: AssignQuestionpaperTemplateComponent;
  let fixture: ComponentFixture<AssignQuestionpaperTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignQuestionpaperTemplateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignQuestionpaperTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
