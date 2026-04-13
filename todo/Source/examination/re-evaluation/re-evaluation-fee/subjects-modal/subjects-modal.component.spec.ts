import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectsModalComponent } from './subjects-modal.component';

describe('SubjectsModalComponent', () => {
  let component: SubjectsModalComponent;
  let fixture: ComponentFixture<SubjectsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubjectsModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubjectsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
