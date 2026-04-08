import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewTemplateNewComponent } from './view-template-new.component';

describe('ViewTemplateNewComponent', () => {
  let component: ViewTemplateNewComponent;
  let fixture: ComponentFixture<ViewTemplateNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewTemplateNewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewTemplateNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
