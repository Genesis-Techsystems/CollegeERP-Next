import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalizeReEvaluationMarksEntryComponent } from './finalize-re-evaluation-marks-entry.component';

describe('FinalizeReEvaluationMarksEntryComponent', () => {
  let component: FinalizeReEvaluationMarksEntryComponent;
  let fixture: ComponentFixture<FinalizeReEvaluationMarksEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinalizeReEvaluationMarksEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FinalizeReEvaluationMarksEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
