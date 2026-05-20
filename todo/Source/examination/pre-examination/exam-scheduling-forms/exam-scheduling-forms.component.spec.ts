import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamSchedulingFormsComponent } from './exam-scheduling-forms.component';

describe('ExamSchedulingFormsComponent', () => {
  let component: ExamSchedulingFormsComponent;
  let fixture: ComponentFixture<ExamSchedulingFormsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamSchedulingFormsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamSchedulingFormsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
