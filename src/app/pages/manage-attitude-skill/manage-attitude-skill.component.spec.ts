import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ManageAttitudeSkillComponent} from './manage-attitude-skill.component';

describe('ManageAttitudeSkillComponent', () => {
  let component: ManageAttitudeSkillComponent;
  let fixture: ComponentFixture<ManageAttitudeSkillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAttitudeSkillComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ManageAttitudeSkillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
