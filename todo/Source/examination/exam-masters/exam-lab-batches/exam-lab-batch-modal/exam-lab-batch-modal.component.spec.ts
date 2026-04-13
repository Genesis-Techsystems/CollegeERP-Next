import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamLabBatchModalComponent } from './exam-lab-batch-modal.component';

describe('ExamLabBatchModalComponent', () => {
  let component: ExamLabBatchModalComponent;
  let fixture: ComponentFixture<ExamLabBatchModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamLabBatchModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamLabBatchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
