import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamCenterSeatingStickersComponent } from './exam-center-seating-stickers.component';

describe('ExamCenterSeatingStickersComponent', () => {
  let component: ExamCenterSeatingStickersComponent;
  let fixture: ComponentFixture<ExamCenterSeatingStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamCenterSeatingStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamCenterSeatingStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
