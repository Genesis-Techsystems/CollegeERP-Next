import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OmrSheetsDesignComponent } from './omr-sheets-design.component';

describe('OmrSheetsDesignComponent', () => {
  let component: OmrSheetsDesignComponent;
  let fixture: ComponentFixture<OmrSheetsDesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OmrSheetsDesignComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OmrSheetsDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
