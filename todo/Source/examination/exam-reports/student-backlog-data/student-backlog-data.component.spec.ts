import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentBacklogDataComponent } from './student-backlog-data.component';

describe('StudentBacklogDataComponent', () => {
  let component: StudentBacklogDataComponent;
  let fixture: ComponentFixture<StudentBacklogDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentBacklogDataComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentBacklogDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
