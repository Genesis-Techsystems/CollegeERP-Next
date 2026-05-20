import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamModerationReportsComponent } from './exam-moderation-reports.component';

describe('ExamModerationReportsComponent', () => {
  let component: ExamModerationReportsComponent;
  let fixture: ComponentFixture<ExamModerationReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamModerationReportsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamModerationReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
