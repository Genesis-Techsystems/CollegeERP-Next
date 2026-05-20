import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterSeatingorderComponent } from './exam-center-seatingorder.component';

describe('ExamCenterSeatingorderComponent', () => {
  let component: ExamCenterSeatingorderComponent;
  let fixture: ComponentFixture<ExamCenterSeatingorderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterSeatingorderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterSeatingorderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
