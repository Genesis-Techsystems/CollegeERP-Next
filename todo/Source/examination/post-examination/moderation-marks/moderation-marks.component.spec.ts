import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModerationMarksComponent } from './moderation-marks.component';

describe('ModerationMarksComponent', () => {
  let component: ModerationMarksComponent;
  let fixture: ComponentFixture<ModerationMarksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModerationMarksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModerationMarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
