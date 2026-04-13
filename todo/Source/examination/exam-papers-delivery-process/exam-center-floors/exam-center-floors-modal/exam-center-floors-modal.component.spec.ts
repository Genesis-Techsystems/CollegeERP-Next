import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterFloorsModalComponent } from './exam-center-floors-modal.component';

describe('ExamCenterFloorsModalComponent', () => {
  let component: ExamCenterFloorsModalComponent;
  let fixture: ComponentFixture<ExamCenterFloorsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterFloorsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterFloorsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
