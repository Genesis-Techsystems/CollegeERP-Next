import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalResultAnalysisComponent } from './final-result-analysis.component';

describe('FinalResultAnalysisComponent', () => {
  let component: FinalResultAnalysisComponent;
  let fixture: ComponentFixture<FinalResultAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinalResultAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FinalResultAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
