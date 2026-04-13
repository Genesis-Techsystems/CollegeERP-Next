import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradeRuleSettingsComponent } from './grade-rule-settings.component';

describe('GradeRuleSettingsComponent', () => {
  let component: GradeRuleSettingsComponent;
  let fixture: ComponentFixture<GradeRuleSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GradeRuleSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GradeRuleSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
