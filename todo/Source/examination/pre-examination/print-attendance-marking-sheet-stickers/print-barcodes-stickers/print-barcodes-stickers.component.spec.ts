import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintBarcodesStickersComponent } from './print-barcodes-stickers.component';

describe('PrintBarcodesStickersComponent', () => {
  let component: PrintBarcodesStickersComponent;
  let fixture: ComponentFixture<PrintBarcodesStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintBarcodesStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintBarcodesStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
