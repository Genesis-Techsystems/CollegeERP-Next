import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalLabMarksEnteredComponent } from './external-lab-marks-entered.component';

describe('ExternalLabMarksEnteredComponent', () => {
  let component: ExternalLabMarksEnteredComponent;
  let fixture: ComponentFixture<ExternalLabMarksEnteredComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExternalLabMarksEnteredComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExternalLabMarksEnteredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
