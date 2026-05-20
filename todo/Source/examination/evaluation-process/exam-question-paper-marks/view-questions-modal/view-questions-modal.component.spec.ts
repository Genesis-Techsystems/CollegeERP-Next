import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewQuestionsModalComponent } from './view-questions-modal.component';

describe('ViewQuestionsModalComponent', () => {
  let component: ViewQuestionsModalComponent;
  let fixture: ComponentFixture<ViewQuestionsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewQuestionsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewQuestionsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
