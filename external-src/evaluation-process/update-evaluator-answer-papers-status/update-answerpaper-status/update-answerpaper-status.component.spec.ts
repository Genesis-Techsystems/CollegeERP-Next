import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateAnswerpaperStatusComponent } from './update-answerpaper-status.component';

describe('UpdateAnswerpaperStatusComponent', () => {
  let component: UpdateAnswerpaperStatusComponent;
  let fixture: ComponentFixture<UpdateAnswerpaperStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpdateAnswerpaperStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateAnswerpaperStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
