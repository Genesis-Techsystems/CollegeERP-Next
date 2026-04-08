import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuTSheetComponent } from './jntu-t-sheet.component';

describe('JntuTSheetComponent', () => {
  let component: JntuTSheetComponent;
  let fixture: ComponentFixture<JntuTSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuTSheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuTSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
