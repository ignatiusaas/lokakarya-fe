import {ComponentFixture, TestBed} from '@angular/core/testing';

import {EmployeeAchievementSkillComponent} from './employee-achievement-skill.component';

describe('EmployeeAchievementSkillComponent', () => {
  let component: EmployeeAchievementSkillComponent;
  let fixture: ComponentFixture<EmployeeAchievementSkillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeAchievementSkillComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EmployeeAchievementSkillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
