import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamRegisteredStudentsCountComponent } from './exam-registered-students-count.component';

describe('ExamRegisteredStudentsCountComponent', () => {
  let component: ExamRegisteredStudentsCountComponent;
  let fixture: ComponentFixture<ExamRegisteredStudentsCountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamRegisteredStudentsCountComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamRegisteredStudentsCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
