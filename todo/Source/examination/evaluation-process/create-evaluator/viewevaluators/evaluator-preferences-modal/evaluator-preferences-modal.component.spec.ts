import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluatorPreferencesModalComponent } from './evaluator-preferences-modal.component';

describe('EvaluatorPreferencesModalComponent', () => {
  let component: EvaluatorPreferencesModalComponent;
  let fixture: ComponentFixture<EvaluatorPreferencesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluatorPreferencesModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluatorPreferencesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
