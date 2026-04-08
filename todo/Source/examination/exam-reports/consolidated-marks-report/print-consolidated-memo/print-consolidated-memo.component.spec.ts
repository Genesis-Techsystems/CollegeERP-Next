import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintConsolidatedMemoComponent } from './print-consolidated-memo.component';

describe('PrintConsolidatedMemoComponent', () => {
  let component: PrintConsolidatedMemoComponent;
  let fixture: ComponentFixture<PrintConsolidatedMemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintConsolidatedMemoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintConsolidatedMemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
