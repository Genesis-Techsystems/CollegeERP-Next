import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradeCardModalComponent } from './grade-card-modal.component';

describe('GradeCardModalComponent', () => {
  let component: GradeCardModalComponent;
  let fixture: ComponentFixture<GradeCardModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GradeCardModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GradeCardModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
