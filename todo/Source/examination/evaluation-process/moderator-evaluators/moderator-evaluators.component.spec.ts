import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModeratorEvaluatorsComponent } from './moderator-evaluators.component';

describe('ModeratorEvaluatorsComponent', () => {
  let component: ModeratorEvaluatorsComponent;
  let fixture: ComponentFixture<ModeratorEvaluatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModeratorEvaluatorsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModeratorEvaluatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
