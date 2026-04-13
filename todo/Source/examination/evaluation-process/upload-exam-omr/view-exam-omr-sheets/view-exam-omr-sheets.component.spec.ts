import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewExamOmrSheetsComponent } from './view-exam-omr-sheets.component';

describe('ViewExamOmrSheetsComponent', () => {
  let component: ViewExamOmrSheetsComponent;
  let fixture: ComponentFixture<ViewExamOmrSheetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewExamOmrSheetsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewExamOmrSheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
