import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateExamLabBatchesComponent } from './update-exam-lab-batches.component';

describe('UpdateExamLabBatchesComponent', () => {
  let component: UpdateExamLabBatchesComponent;
  let fixture: ComponentFixture<UpdateExamLabBatchesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpdateExamLabBatchesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateExamLabBatchesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
