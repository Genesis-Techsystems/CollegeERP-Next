import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterGroupStickersComponent } from './exam-center-group-stickers.component';

describe('ExamCenterGroupStickersComponent', () => {
  let component: ExamCenterGroupStickersComponent;
  let fixture: ComponentFixture<ExamCenterGroupStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterGroupStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterGroupStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
