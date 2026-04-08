import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamBagsModalComponent } from './univ-exam-bags-modal.component';

describe('UnivExamBagsModalComponent', () => {
  let component: UnivExamBagsModalComponent;
  let fixture: ComponentFixture<UnivExamBagsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamBagsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamBagsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
