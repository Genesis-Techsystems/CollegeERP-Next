import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamBundlesComponent } from './add-exam-bundles.component';

describe('AddExamBundlesComponent', () => {
  let component: AddExamBundlesComponent;
  let fixture: ComponentFixture<AddExamBundlesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddExamBundlesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExamBundlesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
