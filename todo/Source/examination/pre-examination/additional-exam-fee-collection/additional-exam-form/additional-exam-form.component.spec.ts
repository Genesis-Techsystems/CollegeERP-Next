import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdditionalExamFormComponent } from './additional-exam-form.component';

describe('ExamFormComponent', () => {
  let component: AdditionalExamFormComponent;
  let fixture: ComponentFixture<AdditionalExamFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdditionalExamFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdditionalExamFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
