import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualQuestionsComponent } from './manual-questions.component';

describe('ManualQuestionsComponent', () => {
  let component: ManualQuestionsComponent;
  let fixture: ComponentFixture<ManualQuestionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManualQuestionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManualQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
