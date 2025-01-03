import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ManageRoleAccessComponent} from './manage-role-access.component';

describe('ManageRoleAccessComponent', () => {
  let component: ManageRoleAccessComponent;
  let fixture: ComponentFixture<ManageRoleAccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageRoleAccessComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ManageRoleAccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
