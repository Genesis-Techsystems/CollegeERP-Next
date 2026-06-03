import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamScanBundlesPrintSticketsGuComponent } from './exam-scan-bundles-print-stickets-gu.component';

describe('ExamScanBundlesPrintSticketsGuComponent', () => {
  let component: ExamScanBundlesPrintSticketsGuComponent;
  let fixture: ComponentFixture<ExamScanBundlesPrintSticketsGuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamScanBundlesPrintSticketsGuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamScanBundlesPrintSticketsGuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
