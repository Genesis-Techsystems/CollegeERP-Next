import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamModalComponentComponent } from './exam-modal-component.component';

describe('ExamModalComponentComponent', () => {
  let component: ExamModalComponentComponent;
  let fixture: ComponentFixture<ExamModalComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamModalComponentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamModalComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
