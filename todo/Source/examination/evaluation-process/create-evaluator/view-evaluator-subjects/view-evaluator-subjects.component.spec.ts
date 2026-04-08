import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewEvaluatorSubjectsComponent } from './view-evaluator-subjects.component';

describe('ViewEvaluatorSubjectsComponent', () => {
  let component: ViewEvaluatorSubjectsComponent;
  let fixture: ComponentFixture<ViewEvaluatorSubjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewEvaluatorSubjectsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewEvaluatorSubjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
