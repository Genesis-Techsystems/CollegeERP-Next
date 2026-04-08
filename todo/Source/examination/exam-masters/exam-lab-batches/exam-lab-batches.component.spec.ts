import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamLabBatchesComponent } from './exam-lab-batches.component';

describe('ExamLabBatchesComponent', () => {
  let component: ExamLabBatchesComponent;
  let fixture: ComponentFixture<ExamLabBatchesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamLabBatchesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamLabBatchesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
