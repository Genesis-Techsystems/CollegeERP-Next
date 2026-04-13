import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadExamOmrComponent } from './upload-exam-omr.component';

describe('UploadExamOmrComponent', () => {
  let component: UploadExamOmrComponent;
  let fixture: ComponentFixture<UploadExamOmrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UploadExamOmrComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadExamOmrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
