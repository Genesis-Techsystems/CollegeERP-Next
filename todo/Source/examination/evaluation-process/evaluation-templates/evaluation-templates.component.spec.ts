import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationTemplatesComponent } from './evaluation-templates.component';

describe('EvaluationTemplatesComponent', () => {
  let component: EvaluationTemplatesComponent;
  let fixture: ComponentFixture<EvaluationTemplatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluationTemplatesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluationTemplatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
