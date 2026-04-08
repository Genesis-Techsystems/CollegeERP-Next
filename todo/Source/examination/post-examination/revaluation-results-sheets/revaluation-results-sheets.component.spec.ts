import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevaluationResultsSheetsComponent } from './revaluation-results-sheets.component';

describe('RevaluationResultsSheetsComponent', () => {
  let component: RevaluationResultsSheetsComponent;
  let fixture: ComponentFixture<RevaluationResultsSheetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RevaluationResultsSheetsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RevaluationResultsSheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
