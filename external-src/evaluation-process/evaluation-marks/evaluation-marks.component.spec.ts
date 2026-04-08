import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationMarksComponent } from './evaluation-marks.component';

describe('EvaluationMarksComponent', () => {
  let component: EvaluationMarksComponent;
  let fixture: ComponentFixture<EvaluationMarksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluationMarksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluationMarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
