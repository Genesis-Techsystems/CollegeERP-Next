import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChiefEvaluationPagesComponent } from './chief-evaluation-pages.component';

describe('ChiefEvaluationPagesComponent', () => {
  let component: ChiefEvaluationPagesComponent;
  let fixture: ComponentFixture<ChiefEvaluationPagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChiefEvaluationPagesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChiefEvaluationPagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
