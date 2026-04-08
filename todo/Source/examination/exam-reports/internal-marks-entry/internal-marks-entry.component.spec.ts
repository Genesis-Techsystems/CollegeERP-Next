import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalMarksEntryComponent } from './internal-marks-entry.component';

describe('InternalMarksEntryComponent', () => {
  let component: InternalMarksEntryComponent;
  let fixture: ComponentFixture<InternalMarksEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InternalMarksEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InternalMarksEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
