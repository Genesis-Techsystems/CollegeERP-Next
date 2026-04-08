import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExmAnswerpaperComponent } from './add-exm-answerpaper.component';

describe('AddExmAnswerpaperComponent', () => {
  let component: AddExmAnswerpaperComponent;
  let fixture: ComponentFixture<AddExmAnswerpaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExmAnswerpaperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExmAnswerpaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
