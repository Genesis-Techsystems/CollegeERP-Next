import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamReValuationFeeSetupComponent } from './exam-re-valuation-fee-setup.component';

describe('ExamReValuationFeeSetupComponent', () => {
  let component: ExamReValuationFeeSetupComponent;
  let fixture: ComponentFixture<ExamReValuationFeeSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamReValuationFeeSetupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamReValuationFeeSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
