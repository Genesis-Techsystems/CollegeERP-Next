import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanUploadPapersComponent } from './scan-upload-papers.component';

describe('ScanUploadPapersComponent', () => {
  let component: ScanUploadPapersComponent;
  let fixture: ComponentFixture<ScanUploadPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScanUploadPapersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScanUploadPapersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
