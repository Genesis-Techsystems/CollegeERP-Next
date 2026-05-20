import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamSchedulingFormsComponent } from './add-exam-scheduling-forms.component';

describe('AddExamSchedulingFormsComponent', () => {
  let component: AddExamSchedulingFormsComponent;
  let fixture: ComponentFixture<AddExamSchedulingFormsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExamSchedulingFormsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExamSchedulingFormsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
