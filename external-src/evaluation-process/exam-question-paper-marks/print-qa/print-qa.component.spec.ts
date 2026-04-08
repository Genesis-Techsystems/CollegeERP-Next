import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintQAComponent } from './print-qa.component';

describe('PrintQAComponent', () => {
  let component: PrintQAComponent;
  let fixture: ComponentFixture<PrintQAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintQAComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintQAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
