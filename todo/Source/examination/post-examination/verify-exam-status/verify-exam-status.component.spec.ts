import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyExamStatusComponent } from './verify-exam-status.component';

describe('VerifyExamStatusComponent', () => {
  let component: VerifyExamStatusComponent;
  let fixture: ComponentFixture<VerifyExamStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VerifyExamStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VerifyExamStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
