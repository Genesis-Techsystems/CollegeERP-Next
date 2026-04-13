import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReEvaluationAssignComponent } from './re-evaluation-assign.component';

describe('ReEvaluationAssignComponent', () => {
  let component: ReEvaluationAssignComponent;
  let fixture: ComponentFixture<ReEvaluationAssignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReEvaluationAssignComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReEvaluationAssignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
