import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGradeRuleModalComponent } from './add-grade-rule-modal.component';

describe('AddGradeRuleModalComponent', () => {
  let component: AddGradeRuleModalComponent;
  let fixture: ComponentFixture<AddGradeRuleModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddGradeRuleModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddGradeRuleModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
