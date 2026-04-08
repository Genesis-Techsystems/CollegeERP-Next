import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEvaluatorBankDetailsComponent } from './add-evaluator-bank-details.component';

describe('AddEvaluatorBankDetailsComponent', () => {
  let component: AddEvaluatorBankDetailsComponent;
  let fixture: ComponentFixture<AddEvaluatorBankDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddEvaluatorBankDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEvaluatorBankDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
