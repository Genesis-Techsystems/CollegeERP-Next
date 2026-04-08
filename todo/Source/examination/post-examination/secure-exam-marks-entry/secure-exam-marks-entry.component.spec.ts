import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecureExamMarksEntryComponent } from './secure-exam-marks-entry.component';

describe('SecureExamMarksEntryComponent', () => {
  let component: SecureExamMarksEntryComponent;
  let fixture: ComponentFixture<SecureExamMarksEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SecureExamMarksEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SecureExamMarksEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
