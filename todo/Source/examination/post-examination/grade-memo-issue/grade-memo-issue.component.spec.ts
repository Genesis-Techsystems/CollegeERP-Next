import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradeMemoIssueComponent } from './grade-memo-issue.component';

describe('GradeMemoIssueComponent', () => {
  let component: GradeMemoIssueComponent;
  let fixture: ComponentFixture<GradeMemoIssueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GradeMemoIssueComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GradeMemoIssueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
