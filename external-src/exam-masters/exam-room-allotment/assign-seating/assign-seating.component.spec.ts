import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignSeatingComponent } from './assign-seating.component';

describe('AssignSeatingComponent', () => {
  let component: AssignSeatingComponent;
  let fixture: ComponentFixture<AssignSeatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignSeatingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignSeatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
