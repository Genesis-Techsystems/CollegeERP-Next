import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalExamEntriesComponent } from './internal-exam-entries.component';

describe('InternalExamEntriesComponent', () => {
  let component: InternalExamEntriesComponent;
  let fixture: ComponentFixture<InternalExamEntriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InternalExamEntriesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InternalExamEntriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
