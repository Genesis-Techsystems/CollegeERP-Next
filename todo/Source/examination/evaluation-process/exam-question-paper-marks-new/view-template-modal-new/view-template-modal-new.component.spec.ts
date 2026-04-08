import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewTemplateModalComponent } from './view-template-modal.component';

describe('ViewTemplateModalComponent', () => {
  let component: ViewTemplateModalComponent;
  let fixture: ComponentFixture<ViewTemplateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewTemplateModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewTemplateModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
