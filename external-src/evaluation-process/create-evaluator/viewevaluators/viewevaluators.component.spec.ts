import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewevaluatorsComponent } from './viewevaluators.component';

describe('ViewevaluatorsComponent', () => {
  let component: ViewevaluatorsComponent;
  let fixture: ComponentFixture<ViewevaluatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewevaluatorsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewevaluatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
