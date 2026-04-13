import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterBuildingsComponent } from './exam-center-buildings.component';

describe('ExamCenterBuildingsComponent', () => {
  let component: ExamCenterBuildingsComponent;
  let fixture: ComponentFixture<ExamCenterBuildingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterBuildingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterBuildingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
