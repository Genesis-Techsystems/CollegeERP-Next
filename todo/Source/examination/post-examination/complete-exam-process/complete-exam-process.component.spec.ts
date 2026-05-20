import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompleteExamProcessComponent } from './complete-exam-process.component';

describe('CompleteExamProcessComponent', () => {
  let component: CompleteExamProcessComponent;
  let fixture: ComponentFixture<CompleteExamProcessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompleteExamProcessComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CompleteExamProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
