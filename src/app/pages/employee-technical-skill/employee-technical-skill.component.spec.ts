import {ComponentFixture, TestBed} from '@angular/core/testing';

import {EmployeeTechnicalSkillComponent} from './employee-technical-skill.component';

describe('EmployeeTechnicalSkillComponent', () => {
  let component: EmployeeTechnicalSkillComponent;
  let fixture: ComponentFixture<EmployeeTechnicalSkillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeTechnicalSkillComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EmployeeTechnicalSkillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
