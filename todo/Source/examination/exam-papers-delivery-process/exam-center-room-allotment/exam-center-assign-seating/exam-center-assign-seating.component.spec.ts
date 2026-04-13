import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterAssignSeatingComponent } from './exam-center-assign-seating.component';

describe('ExamCenterAssignSeatingComponent', () => {
  let component: ExamCenterAssignSeatingComponent;
  let fixture: ComponentFixture<ExamCenterAssignSeatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterAssignSeatingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterAssignSeatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
