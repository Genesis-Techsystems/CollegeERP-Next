import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEvaluatorBankdetailsComponent } from './add-evaluator-bankdetails.component';

describe('AddEvaluatorBankdetailsComponent', () => {
  let component: AddEvaluatorBankdetailsComponent;
  let fixture: ComponentFixture<AddEvaluatorBankdetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddEvaluatorBankdetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEvaluatorBankdetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
