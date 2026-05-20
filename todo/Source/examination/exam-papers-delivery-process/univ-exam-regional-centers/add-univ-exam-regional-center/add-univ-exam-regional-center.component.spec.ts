import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUnivExamRegionalCenterComponent } from './add-univ-exam-regional-center.component';

describe('AddUnivExamRegionalCenterComponent', () => {
  let component: AddUnivExamRegionalCenterComponent;
  let fixture: ComponentFixture<AddUnivExamRegionalCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddUnivExamRegionalCenterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddUnivExamRegionalCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
