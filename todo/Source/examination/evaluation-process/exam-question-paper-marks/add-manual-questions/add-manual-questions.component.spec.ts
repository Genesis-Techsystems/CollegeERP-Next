import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddManualQuestionsComponent } from './add-manual-questions.component';

describe('AddManualQuestionsComponent', () => {
  let component: AddManualQuestionsComponent;
  let fixture: ComponentFixture<AddManualQuestionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddManualQuestionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddManualQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
