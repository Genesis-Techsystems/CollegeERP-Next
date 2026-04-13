import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterExistingAllotmentComponent } from './exam-center-existing-allotment.component';

describe('ExamCenterExistingAllotmentComponent', () => {
  let component: ExamCenterExistingAllotmentComponent;
  let fixture: ComponentFixture<ExamCenterExistingAllotmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterExistingAllotmentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterExistingAllotmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
