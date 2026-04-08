import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateExamProfilesComponent } from './update-exam-profiles.component';

describe('UpdateExamProfilesComponent', () => {
  let component: UpdateExamProfilesComponent;
  let fixture: ComponentFixture<UpdateExamProfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpdateExamProfilesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateExamProfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
