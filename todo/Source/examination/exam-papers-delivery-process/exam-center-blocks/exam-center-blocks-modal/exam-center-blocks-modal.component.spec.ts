import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterBlocksModalComponent } from './exam-center-blocks-modal.component';

describe('ExamCenterBlocksModalComponent', () => {
  let component: ExamCenterBlocksModalComponent;
  let fixture: ComponentFixture<ExamCenterBlocksModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterBlocksModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterBlocksModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
