import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamChecklistComponent } from './exam-checklist.component';

describe('ExamChecklistComponent', () => {
  let component: ExamChecklistComponent;
  let fixture: ComponentFixture<ExamChecklistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamChecklistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamChecklistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
