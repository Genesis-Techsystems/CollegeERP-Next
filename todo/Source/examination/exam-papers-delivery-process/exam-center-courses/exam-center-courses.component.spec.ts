import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterCoursesComponent } from './exam-center-courses.component';

describe('ExamCenterCoursesComponent', () => {
  let component: ExamCenterCoursesComponent;
  let fixture: ComponentFixture<ExamCenterCoursesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterCoursesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterCoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
