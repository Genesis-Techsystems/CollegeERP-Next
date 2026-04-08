import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewAnswerSheetsComponent } from './view-answer-sheets.component';

describe('ViewAnswerSheetsComponent', () => {
  let component: ViewAnswerSheetsComponent;
  let fixture: ComponentFixture<ViewAnswerSheetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewAnswerSheetsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewAnswerSheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
