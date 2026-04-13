import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterFloorsComponent } from './exam-center-floors.component';

describe('ExamCenterFloorsComponent', () => {
  let component: ExamCenterFloorsComponent;
  let fixture: ComponentFixture<ExamCenterFloorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterFloorsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterFloorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
