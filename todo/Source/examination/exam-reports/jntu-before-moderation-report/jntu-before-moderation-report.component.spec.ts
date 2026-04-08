import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuBeforeModerationReportComponent } from './jntu-before-moderation-report.component';

describe('JntuBeforeModerationReportComponent', () => {
  let component: JntuBeforeModerationReportComponent;
  let fixture: ComponentFixture<JntuBeforeModerationReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuBeforeModerationReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuBeforeModerationReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
