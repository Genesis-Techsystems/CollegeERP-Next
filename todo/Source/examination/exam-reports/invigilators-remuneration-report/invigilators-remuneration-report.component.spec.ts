import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvigilatorsRemunerationReportComponent } from './invigilators-remuneration-report.component';

describe('InvigilatorsRemunerationReportComponent', () => {
  let component: InvigilatorsRemunerationReportComponent;
  let fixture: ComponentFixture<InvigilatorsRemunerationReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InvigilatorsRemunerationReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InvigilatorsRemunerationReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
