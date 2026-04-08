import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuestionBankNewComponent } from './question-bank-new.component';

describe('QuestionBankComponent', () => {
  let component: QuestionBankNewComponent;
  let fixture: ComponentFixture<QuestionBankNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuestionBankNewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuestionBankNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
