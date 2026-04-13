import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddQuestionPapersModalComponent } from './add-question-papers-modal.component';

describe('AddQuestionPapersModalComponent', () => {
  let component: AddQuestionPapersModalComponent;
  let fixture: ComponentFixture<AddQuestionPapersModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddQuestionPapersModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddQuestionPapersModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
