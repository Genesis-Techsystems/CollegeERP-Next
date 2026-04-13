import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamCentersComponent } from './univ-exam-centers.component';

describe('UnivExamCentersComponent', () => {
  let component: UnivExamCentersComponent;
  let fixture: ComponentFixture<UnivExamCentersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamCentersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
