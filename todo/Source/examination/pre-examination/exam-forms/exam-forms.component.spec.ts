import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamFormsComponent } from './exam-forms.component';

describe('ExamFormsComponent', () => {
  let component: ExamFormsComponent;
  let fixture: ComponentFixture<ExamFormsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamFormsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamFormsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
