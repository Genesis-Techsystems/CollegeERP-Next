import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalMarksEntryReportComponent } from './internal-marks-entry-report.component';

describe('InternalMarksEntryReportComponent', () => {
  let component: InternalMarksEntryReportComponent;
  let fixture: ComponentFixture<InternalMarksEntryReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InternalMarksEntryReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InternalMarksEntryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
