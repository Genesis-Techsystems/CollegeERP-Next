import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamBundlePrintStickersComponent } from './exam-bundle-print-stickers.component';

describe('ExamBundlePrintStickersComponent', () => {
  let component: ExamBundlePrintStickersComponent;
  let fixture: ComponentFixture<ExamBundlePrintStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamBundlePrintStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamBundlePrintStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
