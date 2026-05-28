import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamScanBundlesPrintComponent } from './exam-scan-bundles-print.component';

describe('ExamScanBundlesPrintComponent', () => {
  let component: ExamScanBundlesPrintComponent;
  let fixture: ComponentFixture<ExamScanBundlesPrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamScanBundlesPrintComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamScanBundlesPrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
