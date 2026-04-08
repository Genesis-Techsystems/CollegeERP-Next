import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamBagsComponent } from './univ-exam-bags.component';

describe('UnivExamBagsComponent', () => {
  let component: UnivExamBagsComponent;
  let fixture: ComponentFixture<UnivExamBagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamBagsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamBagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
