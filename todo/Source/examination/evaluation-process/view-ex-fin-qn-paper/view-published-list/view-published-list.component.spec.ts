import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewPublishedListComponent } from './view-published-list.component';

describe('ViewPublishedListComponent', () => {
  let component: ViewPublishedListComponent;
  let fixture: ComponentFixture<ViewPublishedListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewPublishedListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewPublishedListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
