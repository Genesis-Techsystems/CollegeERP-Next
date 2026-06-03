import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamGroupDetailsComponent } from './exam-group-details.component';

describe('ExamGroupDetailsComponent', () => {
  let component: ExamGroupDetailsComponent;
  let fixture: ComponentFixture<ExamGroupDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamGroupDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamGroupDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
