import {ComponentFixture, TestBed} from '@angular/core/testing';

import {EmployeeAttitudeSkillComponent} from './employee-attitude-skill.component';

describe('EmployeeAttitudeSkillComponent', () => {
  let component: EmployeeAttitudeSkillComponent;
  let fixture: ComponentFixture<EmployeeAttitudeSkillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeAttitudeSkillComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EmployeeAttitudeSkillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
