import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetentionReportComponent } from './detention-report.component';

describe('DetentionReportComponent', () => {
  let component: DetentionReportComponent;
  let fixture: ComponentFixture<DetentionReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DetentionReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DetentionReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
