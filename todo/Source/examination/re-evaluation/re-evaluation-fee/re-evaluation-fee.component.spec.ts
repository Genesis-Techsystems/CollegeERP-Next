import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReEvaluationFeeComponent } from './re-evaluation-fee.component';

describe('ReEvaluationFeeComponent', () => {
  let component: ReEvaluationFeeComponent;
  let fixture: ComponentFixture<ReEvaluationFeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReEvaluationFeeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReEvaluationFeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
