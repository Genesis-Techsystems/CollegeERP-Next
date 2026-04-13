import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TSheetsComponent } from './t-sheets.component';

describe('TSheetsComponent', () => {
  let component: TSheetsComponent;
  let fixture: ComponentFixture<TSheetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TSheetsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TSheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
