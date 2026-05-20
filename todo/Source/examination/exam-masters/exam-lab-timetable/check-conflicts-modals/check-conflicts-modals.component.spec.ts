import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckConflictsModalsComponent } from './check-conflicts-modals.component';

describe('CheckConflictsModalsComponent', () => {
  let component: CheckConflictsModalsComponent;
  let fixture: ComponentFixture<CheckConflictsModalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CheckConflictsModalsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CheckConflictsModalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
