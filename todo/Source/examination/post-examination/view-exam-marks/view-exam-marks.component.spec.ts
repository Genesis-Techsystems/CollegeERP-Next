import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewExamMarksComponent } from './view-exam-marks.component';

describe('ViewExamMarksComponent', () => {
  let component: ViewExamMarksComponent;
  let fixture: ComponentFixture<ViewExamMarksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewExamMarksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewExamMarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
