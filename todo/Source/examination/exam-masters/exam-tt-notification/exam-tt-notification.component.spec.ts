import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamTtNotificationComponent } from './exam-tt-notification.component';

describe('ExamTtNotificationComponent', () => {
  let component: ExamTtNotificationComponent;
  let fixture: ComponentFixture<ExamTtNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamTtNotificationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamTtNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
