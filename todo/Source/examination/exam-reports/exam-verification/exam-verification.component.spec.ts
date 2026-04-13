import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamVerificationComponent } from './exam-verification.component';

describe('ExamVerificationComponent', () => {
  let component: ExamVerificationComponent;
  let fixture: ComponentFixture<ExamVerificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamVerificationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
