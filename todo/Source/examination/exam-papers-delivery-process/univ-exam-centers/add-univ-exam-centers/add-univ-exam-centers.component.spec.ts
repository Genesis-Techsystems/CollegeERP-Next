import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUnivExamCentersComponent } from './add-univ-exam-centers.component';

describe('AddUnivExamCentersComponent', () => {
  let component: AddUnivExamCentersComponent;
  let fixture: ComponentFixture<AddUnivExamCentersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddUnivExamCentersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddUnivExamCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
