import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamGracemarksReportsComponent } from './exam-gracemarks-reports.component';

describe('ExamGracemarksReportsComponent', () => {
  let component: ExamGracemarksReportsComponent;
  let fixture: ComponentFixture<ExamGracemarksReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamGracemarksReportsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamGracemarksReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
