import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ManageDevPlanComponent} from './manage-dev-plan.component';

describe('ManageDevPlanComponent', () => {
  let component: ManageDevPlanComponent;
  let fixture: ComponentFixture<ManageDevPlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageDevPlanComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ManageDevPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
