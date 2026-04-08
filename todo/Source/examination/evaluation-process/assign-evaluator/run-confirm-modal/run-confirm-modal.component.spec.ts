import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunConfirmModalComponent } from './run-confirm-modal.component';

describe('RunConfirmModalComponent', () => {
  let component: RunConfirmModalComponent;
  let fixture: ComponentFixture<RunConfirmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RunConfirmModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RunConfirmModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
