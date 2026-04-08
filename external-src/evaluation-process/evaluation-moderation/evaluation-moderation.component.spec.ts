import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationModerationComponent } from './evaluation-moderation.component';

describe('EvaluationModerationComponent', () => {
  let component: EvaluationModerationComponent;
  let fixture: ComponentFixture<EvaluationModerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluationModerationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluationModerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
