import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamcenterQuestionPaperConfigComponent } from './univ-examcenter-question-paper-config.component';

describe('UnivExamcenterQuestionPaperConfigComponent', () => {
  let component: UnivExamcenterQuestionPaperConfigComponent;
  let fixture: ComponentFixture<UnivExamcenterQuestionPaperConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamcenterQuestionPaperConfigComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamcenterQuestionPaperConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
