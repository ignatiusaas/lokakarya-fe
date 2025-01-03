import {ComponentFixture, TestBed} from '@angular/core/testing';

import {EmployeeDevPlanComponent} from './employee-dev-plan.component';

describe('EmployeeDevPlanComponent', () => {
  let component: EmployeeDevPlanComponent;
  let fixture: ComponentFixture<EmployeeDevPlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeDevPlanComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EmployeeDevPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
