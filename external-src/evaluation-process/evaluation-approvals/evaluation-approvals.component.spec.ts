import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationApprovalsComponent } from './evaluation-approvals.component';

describe('EvaluationApprovalsComponent', () => {
  let component: EvaluationApprovalsComponent;
  let fixture: ComponentFixture<EvaluationApprovalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluationApprovalsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluationApprovalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
