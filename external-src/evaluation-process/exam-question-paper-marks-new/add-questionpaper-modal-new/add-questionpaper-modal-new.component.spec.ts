import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddQuestionpaperModalComponent } from './add-questionpaper-modal.component';

describe('AddQuestionpaperModalComponent', () => {
  let component: AddQuestionpaperModalComponent;
  let fixture: ComponentFixture<AddQuestionpaperModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddQuestionpaperModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddQuestionpaperModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
