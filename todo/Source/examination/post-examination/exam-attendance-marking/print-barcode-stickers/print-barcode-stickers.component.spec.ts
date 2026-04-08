import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintBarcodeStickersComponent } from './print-barcode-stickers.component';

describe('PrintBarcodeStickersComponent', () => {
  let component: PrintBarcodeStickersComponent;
  let fixture: ComponentFixture<PrintBarcodeStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintBarcodeStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintBarcodeStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
