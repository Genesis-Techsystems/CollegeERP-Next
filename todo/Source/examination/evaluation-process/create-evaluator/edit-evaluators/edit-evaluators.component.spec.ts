import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditEvaluatorsComponent } from './edit-evaluators.component';

describe('EditEvaluatorsComponent', () => {
  let component: EditEvaluatorsComponent;
  let fixture: ComponentFixture<EditEvaluatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditEvaluatorsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditEvaluatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
