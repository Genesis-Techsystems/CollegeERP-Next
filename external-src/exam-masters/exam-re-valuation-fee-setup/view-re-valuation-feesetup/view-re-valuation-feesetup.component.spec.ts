import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewReValuationFeesetupComponent } from './view-re-valuation-feesetup.component';

describe('ViewReValuationFeesetupComponent', () => {
  let component: ViewReValuationFeesetupComponent;
  let fixture: ComponentFixture<ViewReValuationFeesetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewReValuationFeesetupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewReValuationFeesetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
