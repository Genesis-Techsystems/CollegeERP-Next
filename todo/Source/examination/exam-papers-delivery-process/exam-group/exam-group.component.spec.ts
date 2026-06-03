import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamGroupComponent } from './exam-group.component';

describe('ExamGroupComponent', () => {
  let component: ExamGroupComponent;
  let fixture: ComponentFixture<ExamGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamGroupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
