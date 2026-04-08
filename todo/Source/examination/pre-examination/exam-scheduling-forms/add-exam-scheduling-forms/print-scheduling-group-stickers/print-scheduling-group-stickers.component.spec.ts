import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintSchedulingGroupStickersComponent } from './print-scheduling-group-stickers.component';

describe('PrintSchedulingGroupStickersComponent', () => {
  let component: PrintSchedulingGroupStickersComponent;
  let fixture: ComponentFixture<PrintSchedulingGroupStickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintSchedulingGroupStickersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintSchedulingGroupStickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
