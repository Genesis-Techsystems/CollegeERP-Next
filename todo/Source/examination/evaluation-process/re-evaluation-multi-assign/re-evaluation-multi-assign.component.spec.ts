import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReEvaluationMultiAssignComponent } from './re-evaluation-multi-assign.component';

describe('ReEvaluationMultiAssignComponent', () => {
  let component: ReEvaluationMultiAssignComponent;
  let fixture: ComponentFixture<ReEvaluationMultiAssignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReEvaluationMultiAssignComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReEvaluationMultiAssignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
