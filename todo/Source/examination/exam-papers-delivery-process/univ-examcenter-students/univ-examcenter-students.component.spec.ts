import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamcenterStudentsComponent } from './univ-examcenter-students.component';

describe('UnivExamcenterStudentsComponent', () => {
  let component: UnivExamcenterStudentsComponent;
  let fixture: ComponentFixture<UnivExamcenterStudentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamcenterStudentsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamcenterStudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
