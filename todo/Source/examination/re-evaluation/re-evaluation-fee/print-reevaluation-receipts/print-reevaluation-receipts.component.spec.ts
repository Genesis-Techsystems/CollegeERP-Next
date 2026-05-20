import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintReevaluationReceiptsComponent } from './print-reevaluation-receipts.component';

describe('PrintReevaluationReceiptsComponent', () => {
  let component: PrintReevaluationReceiptsComponent;
  let fixture: ComponentFixture<PrintReevaluationReceiptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintReevaluationReceiptsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintReevaluationReceiptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
