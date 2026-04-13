import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchWisePassesResultSheetsComponent } from './branch-wise-passes-result-sheets.component';

describe('BranchWisePassesResultSheetsComponent', () => {
  let component: BranchWisePassesResultSheetsComponent;
  let fixture: ComponentFixture<BranchWisePassesResultSheetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BranchWisePassesResultSheetsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BranchWisePassesResultSheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
