import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeModalComponent } from './question-type-modal.component';

describe('QuestionTypeModalComponent', () => {
  let component: QuestionTypeModalComponent;
  let fixture: ComponentFixture<QuestionTypeModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuestionTypeModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuestionTypeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
