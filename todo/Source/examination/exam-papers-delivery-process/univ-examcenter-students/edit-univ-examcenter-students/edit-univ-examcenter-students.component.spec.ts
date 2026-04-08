import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditUnivExamcenterStudentsComponent } from './edit-univ-examcenter-students.component';

describe('EditUnivExamcenterStudentsComponent', () => {
  let component: EditUnivExamcenterStudentsComponent;
  let fixture: ComponentFixture<EditUnivExamcenterStudentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditUnivExamcenterStudentsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditUnivExamcenterStudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
