import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignQpTemplateComponent } from './assign-qp-template.component';

describe('AssignQpTemplateComponent', () => {
  let component: AssignQpTemplateComponent;
  let fixture: ComponentFixture<AssignQpTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignQpTemplateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignQpTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
