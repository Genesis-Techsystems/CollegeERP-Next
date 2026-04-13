import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamStudentBarcodeGenerationComponent } from './exam-student-barcode-generation.component';

describe('ExamStudentBarcodeGenerationComponent', () => {
  let component: ExamStudentBarcodeGenerationComponent;
  let fixture: ComponentFixture<ExamStudentBarcodeGenerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamStudentBarcodeGenerationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamStudentBarcodeGenerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
