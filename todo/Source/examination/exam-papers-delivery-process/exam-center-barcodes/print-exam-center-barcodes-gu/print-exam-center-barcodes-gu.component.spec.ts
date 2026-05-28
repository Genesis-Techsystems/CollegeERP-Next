import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintExamCenterBarcodesGuComponent } from './print-exam-center-barcodes-gu.component';

describe('PrintExamCenterBarcodesGuComponent', () => {
  let component: PrintExamCenterBarcodesGuComponent;
  let fixture: ComponentFixture<PrintExamCenterBarcodesGuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintExamCenterBarcodesGuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintExamCenterBarcodesGuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
