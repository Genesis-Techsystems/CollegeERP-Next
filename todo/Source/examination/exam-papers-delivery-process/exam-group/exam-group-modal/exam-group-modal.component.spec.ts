import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamGroupModalComponent } from './exam-group-modal.component';

describe('ExamGroupModalComponent', () => {
  let component: ExamGroupModalComponent;
  let fixture: ComponentFixture<ExamGroupModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamGroupModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamGroupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
