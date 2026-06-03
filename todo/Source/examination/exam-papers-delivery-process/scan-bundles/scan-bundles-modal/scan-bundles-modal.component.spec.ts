import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanBundlesModalComponent } from './scan-bundles-modal.component';

describe('ScanBundlesModalComponent', () => {
  let component: ScanBundlesModalComponent;
  let fixture: ComponentFixture<ScanBundlesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanBundlesModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanBundlesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
