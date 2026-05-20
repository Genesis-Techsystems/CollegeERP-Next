import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvterSecureCodeComponent } from './evter-secure-code.component';

describe('EvterSecureCodeComponent', () => {
  let component: EvterSecureCodeComponent;
  let fixture: ComponentFixture<EvterSecureCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvterSecureCodeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvterSecureCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
