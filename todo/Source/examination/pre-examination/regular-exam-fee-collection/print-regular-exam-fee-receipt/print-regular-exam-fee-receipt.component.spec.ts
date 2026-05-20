import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintRegularExamFeeReceiptComponent } from './print-regular-exam-fee-receipt.component';

describe('PrintRegularExamFeeReceiptComponent', () => {
  let component: PrintRegularExamFeeReceiptComponent;
  let fixture: ComponentFixture<PrintRegularExamFeeReceiptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintRegularExamFeeReceiptComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintRegularExamFeeReceiptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
