import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintExamFormComponent } from './print-exam-form.component';

describe('PrintExamFormComponent', () => {
  let component: PrintExamFormComponent;
  let fixture: ComponentFixture<PrintExamFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintExamFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintExamFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
