import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamcenterCollegesComponent } from './univ-examcenter-colleges.component';

describe('UnivExamcenterCollegesComponent', () => {
  let component: UnivExamcenterCollegesComponent;
  let fixture: ComponentFixture<UnivExamcenterCollegesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamcenterCollegesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamcenterCollegesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
