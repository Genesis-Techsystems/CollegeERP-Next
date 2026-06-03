import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanBundleDetailsModalComponent } from './scan-bundle-details-modal.component';

describe('ScanBundleDetailsModalComponent', () => {
  let component: ScanBundleDetailsModalComponent;
  let fixture: ComponentFixture<ScanBundleDetailsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanBundleDetailsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanBundleDetailsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
