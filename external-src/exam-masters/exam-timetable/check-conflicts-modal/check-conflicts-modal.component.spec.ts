import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckConflictsModalComponent } from './check-conflicts-modal.component';

describe('CheckConflictsModalComponent', () => {
  let component: CheckConflictsModalComponent;
  let fixture: ComponentFixture<CheckConflictsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CheckConflictsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CheckConflictsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
