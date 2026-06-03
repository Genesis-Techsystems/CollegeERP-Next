import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamBundlePrintStickersGuComponent } from './exam-bundle-print-stickers-gu.component';

describe('ExamBundlePrintStickersGuComponent', () => {
  let component: ExamBundlePrintStickersGuComponent;
  let fixture: ComponentFixture<ExamBundlePrintStickersGuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamBundlePrintStickersGuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamBundlePrintStickersGuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
