import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamScanProfileComponent } from './exam-scan-profile.component';

describe('ExamScanProfileComponent', () => {
  let component: ExamScanProfileComponent;
  let fixture: ComponentFixture<ExamScanProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamScanProfileComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamScanProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
