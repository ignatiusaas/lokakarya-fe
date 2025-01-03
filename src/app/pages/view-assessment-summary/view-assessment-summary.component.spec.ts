import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ViewAssessmentSummaryComponent} from './view-assessment-summary.component';

describe('ViewAssessmentSummaryComponent', () => {
  let component: ViewAssessmentSummaryComponent;
  let fixture: ComponentFixture<ViewAssessmentSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewAssessmentSummaryComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ViewAssessmentSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
