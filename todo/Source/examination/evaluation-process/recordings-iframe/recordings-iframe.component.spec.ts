import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordingsIframeComponent } from './recordings-iframe.component';

describe('RecordingsIframeComponent', () => {
  let component: RecordingsIframeComponent;
  let fixture: ComponentFixture<RecordingsIframeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecordingsIframeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RecordingsIframeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
