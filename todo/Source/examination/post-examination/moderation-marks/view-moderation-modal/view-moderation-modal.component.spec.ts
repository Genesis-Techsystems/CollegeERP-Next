import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewModerationModalComponent } from './view-moderation-modal.component';

describe('ViewModerationModalComponent', () => {
  let component: ViewModerationModalComponent;
  let fixture: ComponentFixture<ViewModerationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewModerationModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewModerationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
