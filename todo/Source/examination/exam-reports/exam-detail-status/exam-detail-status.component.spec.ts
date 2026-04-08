import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamDetailStatusComponent } from './exam-detail-status.component';

describe('ExamDetailStatusComponent', () => {
  let component: ExamDetailStatusComponent;
  let fixture: ComponentFixture<ExamDetailStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamDetailStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamDetailStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
