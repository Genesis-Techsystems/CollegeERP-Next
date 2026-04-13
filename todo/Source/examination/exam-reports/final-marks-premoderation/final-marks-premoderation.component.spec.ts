import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalMarksPremoderationComponent } from './final-marks-premoderation.component';

describe('FinalMarksPremoderationComponent', () => {
  let component: FinalMarksPremoderationComponent;
  let fixture: ComponentFixture<FinalMarksPremoderationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinalMarksPremoderationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FinalMarksPremoderationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
