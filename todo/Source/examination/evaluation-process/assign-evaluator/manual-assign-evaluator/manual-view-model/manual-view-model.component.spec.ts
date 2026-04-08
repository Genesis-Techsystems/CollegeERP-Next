import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualViewModelComponent } from './manual-view-model.component';

describe('ManualViewModelComponent', () => {
  let component: ManualViewModelComponent;
  let fixture: ComponentFixture<ManualViewModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManualViewModelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManualViewModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
