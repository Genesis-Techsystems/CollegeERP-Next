import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintExamHallticketComponent } from './print-exam-hallticket.component';

describe('PrintExamHallticketComponent', () => {
  let component: PrintExamHallticketComponent;
  let fixture: ComponentFixture<PrintExamHallticketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintExamHallticketComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintExamHallticketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
