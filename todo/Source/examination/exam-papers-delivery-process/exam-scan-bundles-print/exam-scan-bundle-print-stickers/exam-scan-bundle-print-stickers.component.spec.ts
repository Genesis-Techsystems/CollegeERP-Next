import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamScanBundlePrintStickersComponent } from './exam-scan-bundle-print-stickers.component';

describe('ExamScanBundlePrintStickersComponent', () => {
  let component: ExamScanBundlePrintStickersComponent;
  let fixture: ComponentFixture<ExamScanBundlePrintStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamScanBundlePrintStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamScanBundlePrintStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
