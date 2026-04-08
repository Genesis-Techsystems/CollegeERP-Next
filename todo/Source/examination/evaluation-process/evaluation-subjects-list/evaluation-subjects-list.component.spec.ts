import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationSubjectsListComponent } from './evaluation-subjects-list.component';

describe('EvaluationSubjectsListComponent', () => {
  let component: EvaluationSubjectsListComponent;
  let fixture: ComponentFixture<EvaluationSubjectsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluationSubjectsListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluationSubjectsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
