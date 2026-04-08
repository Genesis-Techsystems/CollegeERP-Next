import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabulationRegistrationComponent } from './tabulation-registration.component';

describe('TabulationRegistrationComponent', () => {
  let component: TabulationRegistrationComponent;
  let fixture: ComponentFixture<TabulationRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TabulationRegistrationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabulationRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
