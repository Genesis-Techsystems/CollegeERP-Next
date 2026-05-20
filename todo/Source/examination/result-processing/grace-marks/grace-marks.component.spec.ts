import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraceMarksComponent } from './grace-marks.component';

describe('GraceMarksComponent', () => {
  let component: GraceMarksComponent;
  let fixture: ComponentFixture<GraceMarksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GraceMarksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GraceMarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
