import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabExternalRemunerationReportComponent } from './lab-external-remuneration-report.component';

describe('LabExternalRemunerationReportComponent', () => {
  let component: LabExternalRemunerationReportComponent;
  let fixture: ComponentFixture<LabExternalRemunerationReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LabExternalRemunerationReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabExternalRemunerationReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
