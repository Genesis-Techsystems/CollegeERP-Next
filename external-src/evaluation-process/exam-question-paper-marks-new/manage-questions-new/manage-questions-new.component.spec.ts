import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageQuestionsNewComponent } from './manage-questions-new.component';

describe('ManageQuestionsNewComponent', () => {
  let component: ManageQuestionsNewComponent;
  let fixture: ComponentFixture<ManageQuestionsNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageQuestionsNewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageQuestionsNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
