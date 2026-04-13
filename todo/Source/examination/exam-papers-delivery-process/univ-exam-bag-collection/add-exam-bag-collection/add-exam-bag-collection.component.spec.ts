import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamBagCollectionComponent } from './add-exam-bag-collection.component';

describe('AddExamBagCollectionComponent', () => {
  let component: AddExamBagCollectionComponent;
  let fixture: ComponentFixture<AddExamBagCollectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExamBagCollectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExamBagCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
