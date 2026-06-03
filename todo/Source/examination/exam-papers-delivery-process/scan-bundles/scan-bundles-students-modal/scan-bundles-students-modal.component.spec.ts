import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanBundlesStudentsModalComponent } from './scan-bundles-students-modal.component';

describe('ScanBundlesStudentsModalComponent', () => {
  let component: ScanBundlesStudentsModalComponent;
  let fixture: ComponentFixture<ScanBundlesStudentsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanBundlesStudentsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanBundlesStudentsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
