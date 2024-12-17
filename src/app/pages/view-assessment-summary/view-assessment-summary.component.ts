import { Component, OnInit } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { NgForOf, NgIf } from '@angular/common';
import { MessageService, PrimeNGConfig, PrimeTemplate } from 'primeng/api';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-view-assessment-summary',
  standalone: true,
  imports: [
    ButtonDirective,
    CalendarModule,
    CardModule,
    CheckboxModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    InputSwitchModule,
    InputTextModule,
    NgForOf,
    NgIf,
    PrimeTemplate,
    RadioButtonModule,
    ReactiveFormsModule,
    ToastModule,
    PrimeNgModule,
    NavbarComponent,
  ],
  templateUrl: './view-assessment-summary.component.html',
  styleUrls: ['./view-assessment-summary.component.scss'],
  providers: [ConfirmationService, MessageService],
})
export class ViewAssessmentSummaryComponent implements OnInit {
  maxDate: Date = new Date();
  employees: any[] = [];
  divisions: any[] = [];
  currentUserId: string = this.extractCurrentUserId() || '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  selectedUserId: string = '';
  selectedName: string = '';
  selectedAssessmentYear: Date = new Date();
  selectedYear: number = this.selectedAssessmentYear.getFullYear();
  selectedStatus: number = 0;
  achievements: any[] = [];
  attitudeSkills: any[] = [];
  suggestion: string = '';
  assessmentYear: Date | null = null;
  totalScore: number = 0;
  selectedDivision: string = '';
  selectedDivisionId: string = '';
  selectedPosition: string = '';
  isLoading: boolean = true;
  empUrl: string = '';
  displayAssessmentSummaryDialog: boolean = false;
  summaries: any[] = [];
  allSummaries: any[] = [];
  totalRecords: number = 0;
  rowsPerPage: number = 5;
  globalFilterValue: string = '';
  fetchAllUrl: string = '';

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig
  ) {}

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    if (
      this.currentRoles.includes('MGR') &&
      (!this.currentRoles.includes('HR') || !this.currentRoles.includes('SVP'))
    ) {
      this.selectedDivisionId = this.extractCurrentDivisionId() || '';
    }

    this.fetchAssessmentSummaries();
    this.fetchDivisions();
  }

  fetchDivisions(): void {
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/division/all')
      .subscribe({
        next: (response) => {
          const all = { id: null, division_name: 'All' };
          const res = response.content || [];
          this.divisions = res.slice(); // Ensure `this.divisions` starts fresh if needed
          this.divisions.unshift(all); // Add `all` at the beginning
          console.log('Fetched Divisions:', this.divisions);
        },
        error: (error) => {
          console.error('Error fetching divisions:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch divisions.',
          });
        },
      });
  }

  private extractCurrentUserId(): string | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.userId) {
        console.log('Decoded userId:', decoded.userId);
        return decoded.userId;
      } else {
        console.error('userId not found in JWT.');
        return null;
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }
  fetchSelectedUserDetails(): Promise<void> {
    // if (!this.selectedUserId || this.selectedUserId === '') {
    //   console.warn('No user selected.');
    //   this.selectedUserId = this.currentUserId;
    // }

    const userUrl = `https://lokakarya-be.up.railway.app/appuser/get/${this.selectedUserId}`;

    return new Promise((resolve, reject) => {
      this.http.get<any>(userUrl).subscribe({
        next: (response) => {
          const user = response.content;
          if (user && user.full_name) {
            this.selectedName = user.full_name;
            console.log('Fetched User Full Name:', this.selectedName);

            this.selectedDivision = user.division_name;
            console.log('Fetched User Division:', this.selectedDivision);

            this.selectedDivisionId = user.division_id;
            console.log('Fetched User DivisionId:', this.selectedDivisionId);

            this.selectedPosition = user.position;
            console.log('Fetched User Position:', this.selectedPosition);

            this.selectedStatus = user.employee_status;
            console.log('Fetched User Status:', this.selectedStatus);
          } else {
            console.warn('User full name not found in response.');
            this.selectedName = '';
          }
          resolve();
        },
        error: (error) => {
          console.error('Error fetching user full name:', error);
          this.selectedName = '';
          reject(error);
        },
      });
    });
  }

  private extractCurrentRoles(): any[] {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return [];
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.roles) {
        console.log('Decoded roles:', decoded.roles);
        return decoded.roles;
      } else {
        console.error('roles not found in JWT.');
        return [];
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return [];
    }
  }

  private extractCurrentDivisionId(): string | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.divisionId) {
        console.log('Decoded divisionId:', decoded.divisionId);
        return decoded.divisionId;
      } else {
        console.error('divisionId not found in JWT.');
        return null;
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  fetchAchievementSummary(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching Achievement Summary for ${this.selectedYear} for User ID: ${this.selectedUserId}`
      );

      const summaryUrl = `https://lokakarya-be.up.railway.app/assessmentsummary/achievementsummary/${this.selectedUserId}/${this.selectedYear}`;

      console.log('Sending Request to URL:', summaryUrl);

      this.http.get<any>(summaryUrl).subscribe({
        next: (response) => {
          this.achievements = [];
          const allAchievements = response.content || [];
          console.log('All Achievements:', allAchievements);
          allAchievements.forEach((achievement: any) => {
            if (achievement.enabled === true) {
              this.achievements.push(achievement);
            }
          });
          console.log('Fetched Achievement Summary:', this.achievements);
          resolve();
        },

        error: (error) => {
          console.error('Error Fetching Achievement Summary:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch achievement summary.',
          });
          reject(error);
        },
      });
    });
  }

  fetchAttitudeSkillSummary(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching Attitude Skill Summary for ${this.selectedYear} for User ID: ${this.selectedUserId}`
      );

      const summaryUrl = `https://lokakarya-be.up.railway.app/assessmentsummary/attitudeskillsummary/${this.selectedUserId}/${this.selectedYear}`;

      console.log('Sending Request to URL:', summaryUrl);

      this.http.get<any>(summaryUrl).subscribe({
        next: (response) => {
          this.attitudeSkills = [];
          const allAttitudeSkills = response.content || [];
          allAttitudeSkills.forEach((attitudeSkill: any) => {
            if (attitudeSkill.enabled === true) {
              this.attitudeSkills.push(attitudeSkill);
            }
          });
          console.log('Fetched Attitude Skill Summary:', this.attitudeSkills);
          resolve();
        },
        error: (error) => {
          console.error('Error Fetching Attitude Skill Summary:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch attitude skill summary.',
          });
          reject(error);
        },
      });
    });
  }

  fetchSuggestion(): Promise<void> {
    return new Promise((resolve, reject) => {
      // if (!this.selectedUserId) {
      //   console.warn('No user selected.');
      //   this.selectedUserId = this.currentUserId;
      // }

      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching Attitude Skill Summary for ${this.selectedYear} for User ID: ${this.selectedUserId}`
      );

      const summaryUrl =
        'https://lokakarya-be.up.railway.app/empsuggestion/' +
        this.selectedUserId +
        '/' +
        this.selectedYear;

      console.log('Sending Suggestion Request to URL:', summaryUrl);

      this.http.get<any>(summaryUrl).subscribe({
        next: (response) => {
          this.suggestion = response?.content?.suggestion || '';
          console.log('Fetched Suggestions:', this.suggestion);
          resolve();
        },
        error: (error) => {
          console.error('Error Fetching Suggestions:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch suggestions.',
          });
          reject(error);
        },
      });
    });
  }

  fetchAssessmentSummaries(event?: any): void {
    console.log('Selected divisionId:', this.selectedDivisionId);
    console.log(
      'Fetching assessment summaries from division: ',
      this.selectedDivision
    );

    this.selectedYear = this.selectedAssessmentYear.getFullYear();

    if (!this.allSummaries.length || this.allSummaries.length > 0) {
      this.isLoading = true;

      if (this.selectedDivisionId) {
        this.fetchAllUrl = `https://lokakarya-be.up.railway.app/assessmentsummary/divyear/${this.selectedDivisionId}/${this.selectedYear}`;
        console.log('Sending Request to URL:', this.fetchAllUrl);
      } else {
        this.fetchAllUrl = `https://lokakarya-be.up.railway.app/assessmentsummary/year/${this.selectedYear}`;
        console.log('Sending Request to URL:', this.fetchAllUrl);
      }

      this.http
        .get<any>(this.fetchAllUrl)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (response) => {
            this.allSummaries = response.content || [];
            this.totalRecords = this.allSummaries.length;

            this.applyFiltersAndPagination(event);
          },
          error: (error) => {
            console.error('Error Fetching Assessment Summaries:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch assessment summaries.',
            });
          },
        });
    } else {
      this.applyFiltersAndPagination(event);
    }
  }

  adjustPercentages(): void {
    const totalAchievementPercentage = this.achievements.reduce(
      (sum, achievement) => sum + achievement.percentage,
      0
    );

    const totalAttitudePercentage = this.attitudeSkills.reduce(
      (sum, skill) => sum + skill.percentage,
      0
    );

    const combinedTotalPercentage =
      totalAchievementPercentage + totalAttitudePercentage;

    console.log('Total Achievement Percentage:', totalAchievementPercentage);
    console.log('Total Attitude Percentage:', totalAttitudePercentage);
    console.log('Combined Total Percentage:', combinedTotalPercentage);

    if (combinedTotalPercentage === 0) {
      console.warn(
        'Combined total percentage is 0. Cannot adjust percentages.'
      );
      return;
    }

    const scalingFactor = 100 / combinedTotalPercentage;

    console.log('Scaling Factor:', scalingFactor);

    this.achievements = this.achievements.map((achievement) => ({
      ...achievement,
      percentage: parseFloat(
        (achievement.percentage * scalingFactor).toFixed(2)
      ),
    }));

    this.attitudeSkills = this.attitudeSkills.map((skill) => ({
      ...skill,
      percentage: parseFloat((skill.percentage * scalingFactor).toFixed(2)),
    }));

    const newTotalAchievementPercentage = this.achievements.reduce(
      (sum, achievement) => sum + achievement.percentage,
      0
    );

    const newTotalAttitudePercentage = this.attitudeSkills.reduce(
      (sum, skill) => sum + skill.percentage,
      0
    );

    const newCombinedTotal =
      newTotalAchievementPercentage + newTotalAttitudePercentage;

    console.log(
      'New Total Achievement Percentage:',
      newTotalAchievementPercentage
    );
    console.log('New Total Attitude Percentage:', newTotalAttitudePercentage);
    console.log('New Combined Total Percentage:', newCombinedTotal);
  }

  get totalFinalScore(): number {
    const achievementFinalScore = this.achievements.reduce(
      (sum, achievement) =>
        sum + (achievement.sum_score * achievement.percentage) / 100,
      0
    );

    const attitudeFinalScore = this.attitudeSkills.reduce(
      (sum, skill) => sum + (skill.sum_score * skill.percentage) / 100,
      0
    );

    return achievementFinalScore + attitudeFinalScore;
  }

  async fetchViewAssessmentSummary(userId: string): Promise<void> {
    console.log('Fetching summaries for user: ', userId);
    this.displayAssessmentSummaryDialog = true;
    try {
      this.selectedUserId = userId;
      await Promise.all([
        this.fetchSelectedUserDetails(),
        this.fetchAchievementSummary(),
        this.fetchAttitudeSkillSummary(),
        this.fetchSuggestion(),
      ]);
      this.adjustPercentages();
    } catch (error) {
      console.error('Error fetching summaries:', error);

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch summaries.',
      });
    }
  }

  applyFiltersAndPagination(event?: any): void {
    const startIndex = event?.first || 0;
    const endIndex = startIndex + this.rowsPerPage;

    let filteredSummaries = this.globalFilterValue
      ? this.allSummaries.filter((summary) =>
          Object.values(summary).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allSummaries];

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredSummaries.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    this.summaries = filteredSummaries.slice(startIndex, endIndex);

    this.totalRecords = filteredSummaries.length;
  }

  paginateSummaries(event?: any): void {
    const startIndex = event?.first || 0;
    const endIndex = startIndex + this.rowsPerPage;

    this.summaries = this.allSummaries.slice(startIndex, endIndex);
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  filterGlobal(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    const table = document.querySelector('p-table') as any;
    table.filterGlobal(filterValue, 'contains');
  }

  applyGlobalFilter(): void {
    console.log('Global filter applied:', this.globalFilterValue);
  }
}
