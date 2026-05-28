import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanBundleDetailsComponent } from './scan-bundle-details.component';

describe('ScanBundleDetailsComponent', () => {
  let component: ScanBundleDetailsComponent;
  let fixture: ComponentFixture<ScanBundleDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanBundleDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanBundleDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
