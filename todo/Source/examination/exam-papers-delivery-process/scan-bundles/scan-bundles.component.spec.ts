import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanBundlesComponent } from './scan-bundles.component';

describe('ScanBundlesComponent', () => {
  let component: ScanBundlesComponent;
  let fixture: ComponentFixture<ScanBundlesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanBundlesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanBundlesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
