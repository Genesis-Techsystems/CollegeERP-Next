import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevaluationFeeCollectionComponent } from './revaluation-fee-collection.component';

describe('RevaluationFeeCollectionComponent', () => {
  let component: RevaluationFeeCollectionComponent;
  let fixture: ComponentFixture<RevaluationFeeCollectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RevaluationFeeCollectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RevaluationFeeCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
