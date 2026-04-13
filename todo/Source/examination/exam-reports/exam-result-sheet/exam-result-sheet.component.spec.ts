import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamResultSheetComponent } from './exam-result-sheet.component';

describe('ExamResultSheetComponent', () => {
  let component: ExamResultSheetComponent;
  let fixture: ComponentFixture<ExamResultSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamResultSheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamResultSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
