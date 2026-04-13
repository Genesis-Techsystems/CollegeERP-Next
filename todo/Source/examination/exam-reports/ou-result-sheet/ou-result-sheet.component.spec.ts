import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OuResultSheetComponent } from './ou-result-sheet.component';

describe('OuResultSheetComponent', () => {
  let component: OuResultSheetComponent;
  let fixture: ComponentFixture<OuResultSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OuResultSheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OuResultSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
