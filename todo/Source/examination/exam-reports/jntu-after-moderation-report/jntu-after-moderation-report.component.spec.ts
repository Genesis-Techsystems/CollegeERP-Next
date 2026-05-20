import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuAfterModerationReportComponent } from './jntu-after-moderation-report.component';

describe('JntuAfterModerationReportComponent', () => {
  let component: JntuAfterModerationReportComponent;
  let fixture: ComponentFixture<JntuAfterModerationReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuAfterModerationReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuAfterModerationReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
