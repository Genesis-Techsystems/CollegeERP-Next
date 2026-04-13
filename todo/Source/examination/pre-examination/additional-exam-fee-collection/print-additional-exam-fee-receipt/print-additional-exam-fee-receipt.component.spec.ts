import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrintAdditionalExamFeeReceiptComponent } from './print-additional-exam-fee-receipt.component';

// import { PrintAdditionalExamFeeReceiptComponent } from './print-additional-exam-fee-receipt.component';

describe('PrintAdditionalExamFeeReceiptComponent', () => {
  let component: PrintAdditionalExamFeeReceiptComponent;
  let fixture: ComponentFixture<PrintAdditionalExamFeeReceiptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintAdditionalExamFeeReceiptComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintAdditionalExamFeeReceiptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
