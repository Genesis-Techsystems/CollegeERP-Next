import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddStdAnswerPaperpagesComponent } from './add-std-answer-paperpages.component';

describe('AddStdAnswerPaperpagesComponent', () => {
  let component: AddStdAnswerPaperpagesComponent;
  let fixture: ComponentFixture<AddStdAnswerPaperpagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddStdAnswerPaperpagesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddStdAnswerPaperpagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
