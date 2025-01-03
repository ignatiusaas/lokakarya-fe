import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ManageDivisionComponent} from './manage-division.component';

describe('ManageDivisionComponent', () => {
  let component: ManageDivisionComponent;
  let fixture: ComponentFixture<ManageDivisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageDivisionComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ManageDivisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
