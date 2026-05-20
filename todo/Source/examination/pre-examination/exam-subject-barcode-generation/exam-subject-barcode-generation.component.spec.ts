import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamSubjectBarcodeGenerationComponent } from './exam-subject-barcode-generation.component';

describe('ExamSubjectBarcodeGenerationComponent', () => {
  let component: ExamSubjectBarcodeGenerationComponent;
  let fixture: ComponentFixture<ExamSubjectBarcodeGenerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamSubjectBarcodeGenerationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamSubjectBarcodeGenerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
