import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanBundleDetailsNewModalComponent } from './scan-bundle-details-new-modal.component';

describe('ScanBundleDetailsNewModalComponent', () => {
  let component: ScanBundleDetailsNewModalComponent;
  let fixture: ComponentFixture<ScanBundleDetailsNewModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanBundleDetailsNewModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanBundleDetailsNewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
