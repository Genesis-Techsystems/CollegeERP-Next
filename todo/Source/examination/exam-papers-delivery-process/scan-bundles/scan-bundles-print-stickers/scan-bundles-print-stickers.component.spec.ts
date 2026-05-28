import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanBundlesPrintStickersComponent } from './scan-bundles-print-stickers.component';

describe('ScanBundlesPrintStickersComponent', () => {
  let component: ScanBundlesPrintStickersComponent;
  let fixture: ComponentFixture<ScanBundlesPrintStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanBundlesPrintStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanBundlesPrintStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
