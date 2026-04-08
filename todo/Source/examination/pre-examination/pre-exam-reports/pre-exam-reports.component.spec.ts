import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreExamReportsComponent } from './pre-exam-reports.component';

describe('PreExamReportsComponent', () => {
  let component: PreExamReportsComponent;
  let fixture: ComponentFixture<PreExamReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PreExamReportsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PreExamReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
