import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompleteExamFeeRegistrationComponent } from './complete-exam-fee-registration.component';

describe('CompleteExamFeeRegistrationComponent', () => {
  let component: CompleteExamFeeRegistrationComponent;
  let fixture: ComponentFixture<CompleteExamFeeRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompleteExamFeeRegistrationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CompleteExamFeeRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
