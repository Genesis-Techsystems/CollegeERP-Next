import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamRegionalCentersComponent } from './univ-exam-regional-centers.component';

describe('UnivExamRegionalCentersComponent', () => {
  let component: UnivExamRegionalCentersComponent;
  let fixture: ComponentFixture<UnivExamRegionalCentersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamRegionalCentersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamRegionalCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
