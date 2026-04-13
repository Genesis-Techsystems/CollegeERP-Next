import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarksMemoPrintComponent } from './marks-memo-print.component';

describe('MarksMemoPrintComponent', () => {
  let component: MarksMemoPrintComponent;
  let fixture: ComponentFixture<MarksMemoPrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MarksMemoPrintComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MarksMemoPrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
