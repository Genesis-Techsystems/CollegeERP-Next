import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintFormAComponent } from './print-form-a.component';

describe('PrintFormAComponent', () => {
  let component: PrintFormAComponent;
  let fixture: ComponentFixture<PrintFormAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintFormAComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintFormAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
