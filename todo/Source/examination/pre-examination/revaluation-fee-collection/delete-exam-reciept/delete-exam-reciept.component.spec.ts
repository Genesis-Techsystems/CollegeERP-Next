import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteExamRecieptComponent } from './delete-exam-reciept.component';

describe('DeleteExamRecieptComponent', () => {
  let component: DeleteExamRecieptComponent;
  let fixture: ComponentFixture<DeleteExamRecieptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeleteExamRecieptComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteExamRecieptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
