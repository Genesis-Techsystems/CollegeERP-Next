import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchwiseSgpaReportComponent } from './batchwise-sgpa-report.component';

describe('BatchwiseSgpaReportComponent', () => {
  let component: BatchwiseSgpaReportComponent;
  let fixture: ComponentFixture<BatchwiseSgpaReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BatchwiseSgpaReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BatchwiseSgpaReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
