import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReAssignEvaluavatorComponent } from './re-assign-evaluavator.component';

describe('ReAssignEvaluavatorComponent', () => {
  let component: ReAssignEvaluavatorComponent;
  let fixture: ComponentFixture<ReAssignEvaluavatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReAssignEvaluavatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReAssignEvaluavatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
