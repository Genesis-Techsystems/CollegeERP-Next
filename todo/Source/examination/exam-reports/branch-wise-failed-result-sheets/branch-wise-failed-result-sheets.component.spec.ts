import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchWiseFailedResultSheetsComponent } from './branch-wise-failed-result-sheets.component';

describe('BranchWiseFailedResultSheetsComponent', () => {
  let component: BranchWiseFailedResultSheetsComponent;
  let fixture: ComponentFixture<BranchWiseFailedResultSheetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BranchWiseFailedResultSheetsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BranchWiseFailedResultSheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
