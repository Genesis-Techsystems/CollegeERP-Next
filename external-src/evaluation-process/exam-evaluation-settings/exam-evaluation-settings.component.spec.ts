import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamEvaluationSettingsComponent } from './exam-evaluation-settings.component';

describe('ExamEvaluationSettingsComponent', () => {
  let component: ExamEvaluationSettingsComponent;
  let fixture: ComponentFixture<ExamEvaluationSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamEvaluationSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamEvaluationSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
