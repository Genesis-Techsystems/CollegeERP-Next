import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExistingAllotmentComponent } from './existing-allotment.component';

describe('ExistingAllotmentComponent', () => {
  let component: ExistingAllotmentComponent;
  let fixture: ComponentFixture<ExistingAllotmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExistingAllotmentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExistingAllotmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
