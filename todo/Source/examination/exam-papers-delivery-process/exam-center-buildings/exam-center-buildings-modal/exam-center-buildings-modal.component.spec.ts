import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterBuildingsModalComponent } from './exam-center-buildings-modal.component';

describe('ExamCenterBuildingsModalComponent', () => {
  let component: ExamCenterBuildingsModalComponent;
  let fixture: ComponentFixture<ExamCenterBuildingsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterBuildingsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterBuildingsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
