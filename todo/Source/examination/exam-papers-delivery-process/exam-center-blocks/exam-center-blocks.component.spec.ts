import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterBlocksComponent } from './exam-center-blocks.component';

describe('ExamCenterBlocksComponent', () => {
  let component: ExamCenterBlocksComponent;
  let fixture: ComponentFixture<ExamCenterBlocksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterBlocksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterBlocksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
