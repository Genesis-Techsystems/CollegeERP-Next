import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintQuestionModalanswersComponent } from './print-question-modalanswers.component';

describe('PrintQuestionModalanswersComponent', () => {
  let component: PrintQuestionModalanswersComponent;
  let fixture: ComponentFixture<PrintQuestionModalanswersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintQuestionModalanswersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintQuestionModalanswersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
