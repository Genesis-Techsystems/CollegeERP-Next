import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnivExamBagTransportationComponent } from './univ-exam-bag-transportation.component';

describe('UnivExamBagTransportationComponent', () => {
  let component: UnivExamBagTransportationComponent;
  let fixture: ComponentFixture<UnivExamBagTransportationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnivExamBagTransportationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnivExamBagTransportationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
