import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamBundlePrintComponent } from './exam-bundle-print.component';

describe('ExamBundlePrintComponent', () => {
  let component: ExamBundlePrintComponent;
  let fixture: ComponentFixture<ExamBundlePrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamBundlePrintComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamBundlePrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
