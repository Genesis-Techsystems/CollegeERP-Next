import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamMarksEntryComponent } from './exam-marks-entry.component';

describe('ExamMarksEntryComponent', () => {
  let component: ExamMarksEntryComponent;
  let fixture: ComponentFixture<ExamMarksEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamMarksEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamMarksEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
