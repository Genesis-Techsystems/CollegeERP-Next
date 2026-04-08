import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JntuModerationBenefitedListComponent } from './jntu-moderation-benefited-list.component';

describe('JntuModerationBenefitedListComponent', () => {
  let component: JntuModerationBenefitedListComponent;
  let fixture: ComponentFixture<JntuModerationBenefitedListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JntuModerationBenefitedListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JntuModerationBenefitedListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
