import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamBagTrasportationModalComponent } from './exam-bag-trasportation-modal.component';

describe('ExamBagTrasportationModalComponent', () => {
  let component: ExamBagTrasportationModalComponent;
  let fixture: ComponentFixture<ExamBagTrasportationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamBagTrasportationModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamBagTrasportationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
