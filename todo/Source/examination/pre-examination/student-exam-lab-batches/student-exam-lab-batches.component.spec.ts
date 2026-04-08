import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentExamLabBatchesComponent } from './student-exam-lab-batches.component';

describe('StudentExamLabBatchesComponent', () => {
  let component: StudentExamLabBatchesComponent;
  let fixture: ComponentFixture<StudentExamLabBatchesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentExamLabBatchesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentExamLabBatchesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
