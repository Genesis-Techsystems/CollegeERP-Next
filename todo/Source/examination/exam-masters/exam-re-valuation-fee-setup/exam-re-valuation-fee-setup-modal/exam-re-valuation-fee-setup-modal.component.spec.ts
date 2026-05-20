import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamReValuationFeeSetupModalComponent } from './exam-re-valuation-fee-setup-modal.component';

describe('ExamReValuationFeeSetupModalComponent', () => {
  let component: ExamReValuationFeeSetupModalComponent;
  let fixture: ComponentFixture<ExamReValuationFeeSetupModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamReValuationFeeSetupModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamReValuationFeeSetupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
