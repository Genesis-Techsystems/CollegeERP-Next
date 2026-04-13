import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterCoursesModalComponent } from './exam-center-courses-modal.component';

describe('ExamCenterCoursesModalComponent', () => {
  let component: ExamCenterCoursesModalComponent;
  let fixture: ComponentFixture<ExamCenterCoursesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterCoursesModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterCoursesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
