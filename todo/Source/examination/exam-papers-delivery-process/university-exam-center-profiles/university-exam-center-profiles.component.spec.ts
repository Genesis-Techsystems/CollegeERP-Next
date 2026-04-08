import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniversityExamCenterProfilesComponent } from './university-exam-center-profiles.component';

describe('UniversityExamCenterProfilesComponent', () => {
  let component: UniversityExamCenterProfilesComponent;
  let fixture: ComponentFixture<UniversityExamCenterProfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UniversityExamCenterProfilesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UniversityExamCenterProfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
