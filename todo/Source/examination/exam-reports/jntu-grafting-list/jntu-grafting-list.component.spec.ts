import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuGraftingListComponent } from './jntu-grafting-list.component';

describe('JntuGraftingListComponent', () => {
  let component: JntuGraftingListComponent;
  let fixture: ComponentFixture<JntuGraftingListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuGraftingListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuGraftingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
