import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamBagCollectionComponent } from './univ-exam-bag-collection.component';

describe('UnivExamBagCollectionComponent', () => {
  let component: UnivExamBagCollectionComponent;
  let fixture: ComponentFixture<UnivExamBagCollectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamBagCollectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamBagCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
