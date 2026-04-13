import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditExamTimetablesComponent } from './edit-exam-timetables.component';

describe('EditExamTimetablesComponent', () => {
  let component: EditExamTimetablesComponent;
  let fixture: ComponentFixture<EditExamTimetablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditExamTimetablesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditExamTimetablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
