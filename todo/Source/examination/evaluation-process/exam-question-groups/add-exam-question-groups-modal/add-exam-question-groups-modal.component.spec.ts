import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamQuestionGroupsModalComponent } from './add-exam-question-groups-modal.component';

describe('AddExamQuestionGroupsModalComponent', () => {
  let component: AddExamQuestionGroupsModalComponent;
  let fixture: ComponentFixture<AddExamQuestionGroupsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExamQuestionGroupsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExamQuestionGroupsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
