import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamLabTimetableComponent } from './exam-lab-timetable.component';

describe('ExamLabTimetableComponent', () => {
  let component: ExamLabTimetableComponent;
  let fixture: ComponentFixture<ExamLabTimetableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamLabTimetableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamLabTimetableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
