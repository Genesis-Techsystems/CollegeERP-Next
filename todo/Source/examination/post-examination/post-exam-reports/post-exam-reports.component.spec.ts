import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostExamReportsComponent } from './post-exam-reports.component';

describe('PostExamReportsComponent', () => {
  let component: PostExamReportsComponent;
  let fixture: ComponentFixture<PostExamReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PostExamReportsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PostExamReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
