import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OmrSinglePageDesignComponent } from './omr-single-page-design.component';

describe('OmrSinglePageDesignComponent', () => {
  let component: OmrSinglePageDesignComponent;
  let fixture: ComponentFixture<OmrSinglePageDesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OmrSinglePageDesignComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OmrSinglePageDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
