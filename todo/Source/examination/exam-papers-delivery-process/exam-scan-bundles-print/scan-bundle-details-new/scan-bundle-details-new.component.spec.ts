import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanBundleDetailsNewComponent } from './scan-bundle-details-new.component';

describe('ScanBundleDetailsNewComponent', () => {
  let component: ScanBundleDetailsNewComponent;
  let fixture: ComponentFixture<ScanBundleDetailsNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanBundleDetailsNewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanBundleDetailsNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
