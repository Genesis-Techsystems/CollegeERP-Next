import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplyModerationRuleComponent } from './apply-moderation-rule.component';

describe('ApplyModerationRuleComponent', () => {
  let component: ApplyModerationRuleComponent;
  let fixture: ComponentFixture<ApplyModerationRuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ApplyModerationRuleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApplyModerationRuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
