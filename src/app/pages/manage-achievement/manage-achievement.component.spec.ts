import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ManageAchievementComponent} from './manage-achievement.component';

describe('ManageAchievementComponent', () => {
  let component: ManageAchievementComponent;
  let fixture: ComponentFixture<ManageAchievementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAchievementComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ManageAchievementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
