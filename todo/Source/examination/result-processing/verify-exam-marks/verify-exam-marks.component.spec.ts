import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyExamMarksComponent } from './verify-exam-marks.component';

describe('VerifyExamMarksComponent', () => {
  let component: VerifyExamMarksComponent;
  let fixture: ComponentFixture<VerifyExamMarksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VerifyExamMarksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VerifyExamMarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
