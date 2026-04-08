import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewBarcodeModalComponent } from './view-barcode-modal.component';

describe('ViewBarcodeModalComponent', () => {
  let component: ViewBarcodeModalComponent;
  let fixture: ComponentFixture<ViewBarcodeModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewBarcodeModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewBarcodeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
