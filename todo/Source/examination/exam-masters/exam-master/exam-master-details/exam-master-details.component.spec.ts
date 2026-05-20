import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamMasterDetailsComponent } from './exam-master-details.component';

describe('ExamMasterDetailsComponent', () => {
  let component: ExamMasterDetailsComponent;
  let fixture: ComponentFixture<ExamMasterDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamMasterDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExamMasterDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
