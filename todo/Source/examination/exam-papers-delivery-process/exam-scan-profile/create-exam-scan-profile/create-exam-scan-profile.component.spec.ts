import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateExamScanProfileComponent } from './create-exam-scan-profile.component';

describe('CreateExamScanProfileComponent', () => {
  let component: CreateExamScanProfileComponent;
  let fixture: ComponentFixture<CreateExamScanProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateExamScanProfileComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateExamScanProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
