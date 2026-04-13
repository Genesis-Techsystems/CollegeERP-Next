import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamTimetablesComponent } from './add-exam-timetables.component';

describe('AddExamTimetablesComponent', () => {
  let component: AddExamTimetablesComponent;
  let fixture: ComponentFixture<AddExamTimetablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExamTimetablesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExamTimetablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
