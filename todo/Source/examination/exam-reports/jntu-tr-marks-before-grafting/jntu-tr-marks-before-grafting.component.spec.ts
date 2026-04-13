import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuTrMarksBeforeGraftingComponent } from './jntu-tr-marks-before-grafting.component';

describe('JntuTrMarksBeforeGraftingComponent', () => {
  let component: JntuTrMarksBeforeGraftingComponent;
  let fixture: ComponentFixture<JntuTrMarksBeforeGraftingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuTrMarksBeforeGraftingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuTrMarksBeforeGraftingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
