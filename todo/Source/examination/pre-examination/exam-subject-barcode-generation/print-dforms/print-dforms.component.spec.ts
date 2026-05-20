import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintDformsComponent } from './print-dforms.component';

describe('PrintDformsComponent', () => {
  let component: PrintDformsComponent;
  let fixture: ComponentFixture<PrintDformsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintDformsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintDformsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
