import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReEvaluationMarksEntryComponent } from './re-evaluation-marks-entry.component';

describe('ReEvaluationMarksEntryComponent', () => {
  let component: ReEvaluationMarksEntryComponent;
  let fixture: ComponentFixture<ReEvaluationMarksEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReEvaluationMarksEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReEvaluationMarksEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
