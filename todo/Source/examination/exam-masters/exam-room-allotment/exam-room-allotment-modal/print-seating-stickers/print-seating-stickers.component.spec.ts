import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintSeatingStickersComponent } from './print-seating-stickers.component';

describe('PrintSeatingStickersComponent', () => {
  let component: PrintSeatingStickersComponent;
  let fixture: ComponentFixture<PrintSeatingStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintSeatingStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintSeatingStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
