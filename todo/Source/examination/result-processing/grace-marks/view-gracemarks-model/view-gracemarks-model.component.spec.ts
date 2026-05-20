import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewGracemarksModelComponent } from './view-gracemarks-model.component';

describe('ViewGracemarksModelComponent', () => {
  let component: ViewGracemarksModelComponent;
  let fixture: ComponentFixture<ViewGracemarksModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewGracemarksModelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewGracemarksModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
