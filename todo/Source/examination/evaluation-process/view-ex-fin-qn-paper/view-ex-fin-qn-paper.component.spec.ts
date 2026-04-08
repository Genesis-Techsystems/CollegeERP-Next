import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewExFinQnPaperComponent } from './view-ex-fin-qn-paper.component';

describe('ViewExFinQnPaperComponent', () => {
  let component: ViewExFinQnPaperComponent;
  let fixture: ComponentFixture<ViewExFinQnPaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewExFinQnPaperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewExFinQnPaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
