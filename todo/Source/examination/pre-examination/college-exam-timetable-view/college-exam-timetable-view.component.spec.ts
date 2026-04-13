import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollegeExamTimetableViewComponent } from './college-exam-timetable-view.component';

describe('CollegeExamTimetableViewComponent', () => {
  let component: CollegeExamTimetableViewComponent;
  let fixture: ComponentFixture<CollegeExamTimetableViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CollegeExamTimetableViewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CollegeExamTimetableViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
