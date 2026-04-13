import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamBundlesComponent } from './univ-exam-bundles.component';

describe('UnivExamBundlesComponent', () => {
  let component: UnivExamBundlesComponent;
  let fixture: ComponentFixture<UnivExamBundlesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamBundlesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamBundlesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
