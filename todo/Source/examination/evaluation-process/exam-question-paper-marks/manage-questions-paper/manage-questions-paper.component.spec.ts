import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageQuestionsPaperComponent } from './manage-questions-paper.component';

describe('ManageQuestionsPaperComponent', () => {
  let component: ManageQuestionsPaperComponent;
  let fixture: ComponentFixture<ManageQuestionsPaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageQuestionsPaperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageQuestionsPaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
