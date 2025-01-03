import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ManageTechnicalSkillComponent} from './manage-technical-skill.component';

describe('ManageTechnicalSkillComponent', () => {
  let component: ManageTechnicalSkillComponent;
  let fixture: ComponentFixture<ManageTechnicalSkillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageTechnicalSkillComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ManageTechnicalSkillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
