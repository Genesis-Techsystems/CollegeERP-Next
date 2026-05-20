import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamLabBatchesStudentsComponent } from './exam-lab-batches-students.component';

describe('ExamLabBatchesStudentsComponent', () => {
  let component: ExamLabBatchesStudentsComponent;
  let fixture: ComponentFixture<ExamLabBatchesStudentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamLabBatchesStudentsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamLabBatchesStudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
