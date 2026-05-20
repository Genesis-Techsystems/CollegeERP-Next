import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuTrMarksBeforeModerationComponent } from './jntu-tr-marks-before-moderation.component';

describe('JntuTrMarksBeforeModerationComponent', () => {
  let component: JntuTrMarksBeforeModerationComponent;
  let fixture: ComponentFixture<JntuTrMarksBeforeModerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuTrMarksBeforeModerationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuTrMarksBeforeModerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
