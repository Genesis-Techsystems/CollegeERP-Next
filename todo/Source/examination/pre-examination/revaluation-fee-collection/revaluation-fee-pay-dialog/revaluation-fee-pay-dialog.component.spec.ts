import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevaluationFeePayDialogComponent } from './revaluation-fee-pay-dialog.component';

describe('RevaluationFeePayDialogComponent', () => {
  let component: RevaluationFeePayDialogComponent;
  let fixture: ComponentFixture<RevaluationFeePayDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RevaluationFeePayDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RevaluationFeePayDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
