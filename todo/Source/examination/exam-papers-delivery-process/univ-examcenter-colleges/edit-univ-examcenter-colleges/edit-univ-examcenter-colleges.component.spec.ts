import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditUnivExamcenterCollegesComponent } from './edit-univ-examcenter-colleges.component';

describe('EditUnivExamcenterCollegesComponent', () => {
  let component: EditUnivExamcenterCollegesComponent;
  let fixture: ComponentFixture<EditUnivExamcenterCollegesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditUnivExamcenterCollegesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditUnivExamcenterCollegesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
