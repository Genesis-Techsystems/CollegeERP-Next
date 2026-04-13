import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEvaluationSettingsComponent } from './add-evaluation-settings.component';

describe('AddEvaluationSettingsComponent', () => {
  let component: AddEvaluationSettingsComponent;
  let fixture: ComponentFixture<AddEvaluationSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddEvaluationSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEvaluationSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
