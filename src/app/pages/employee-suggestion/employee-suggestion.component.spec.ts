import {ComponentFixture, TestBed} from '@angular/core/testing';

import {EmployeeSuggestionComponent} from './employee-suggestion.component';

describe('EmployeeSuggestionComponent', () => {
  let component: EmployeeSuggestionComponent;
  let fixture: ComponentFixture<EmployeeSuggestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeSuggestionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeSuggestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
