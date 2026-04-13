import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamRegistrationManualFeelessComponent } from './exam-registration-manual-feeless.component';

describe('ExamRegistrationManualFeelessComponent', () => {
  let component: ExamRegistrationManualFeelessComponent;
  let fixture: ComponentFixture<ExamRegistrationManualFeelessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamRegistrationManualFeelessComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamRegistrationManualFeelessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
