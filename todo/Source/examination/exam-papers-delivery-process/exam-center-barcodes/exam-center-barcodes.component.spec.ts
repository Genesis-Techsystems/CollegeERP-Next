import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterBarcodesComponent } from './exam-center-barcodes.component';

describe('ExamCenterBarcodesComponent', () => {
  let component: ExamCenterBarcodesComponent;
  let fixture: ComponentFixture<ExamCenterBarcodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterBarcodesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterBarcodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
