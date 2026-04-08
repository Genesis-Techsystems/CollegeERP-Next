import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExistingExamTimetablesComponent } from './existing-exam-timetables.component';

describe('ExistingExamTimetablesComponent', () => {
  let component: ExistingExamTimetablesComponent;
  let fixture: ComponentFixture<ExistingExamTimetablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExistingExamTimetablesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExistingExamTimetablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
