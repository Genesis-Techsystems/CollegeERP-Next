import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentAssignedListComponent } from './student-assigned-list.component';

describe('StudentAssignedListComponent', () => {
  let component: StudentAssignedListComponent;
  let fixture: ComponentFixture<StudentAssignedListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentAssignedListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentAssignedListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
