import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintExamCenterBarcodesComponent } from './print-exam-center-barcodes.component';

describe('PrintExamCenterBarcodesComponent', () => {
  let component: PrintExamCenterBarcodesComponent;
  let fixture: ComponentFixture<PrintExamCenterBarcodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintExamCenterBarcodesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintExamCenterBarcodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
