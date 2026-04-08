import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendTtNotificationComponent } from './send-tt-notification.component';

describe('SendTtNotificationComponent', () => {
  let component: SendTtNotificationComponent;
  let fixture: ComponentFixture<SendTtNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SendTtNotificationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SendTtNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
