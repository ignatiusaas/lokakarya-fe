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
import { ConfirmationService } from 'primeng/api';
import { DecimalPipe } from '@angular/common';

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
  providers: [ConfirmationService, MessageService, DecimalPipe],
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
  totalPercentage: number = 0;
  totalAchievementPercentage: number = 0;
  totalAttitudePercentage: number = 0;
  totalAchievementScore: number = 0;
  totalAttitudeScore: number = 0;
  selectedDivision: string = '';
  selectedDivisionId: string = '';
  selectedDivisionIdFilter: string = '';
  selectedDivisionFilter: string = '';
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
  currentPage: number = 1;
  selectedOrderColumn: string = 'au.full_name';
  selectedOrderDirection: string = 'asc';
  selectedAssessmentSummaryId: string = '';

  orderColumns: { label: string; value: string }[] = [
    { label: 'Full Name', value: 'au.full_name' },
    { label: 'Division Name', value: 'division_name' },
    { label: 'Score', value: 'score' },
    { label: 'Approval Status', value: 'status' },
  ];

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig,
    private confirmationService: ConfirmationService,
    private decimal: DecimalPipe
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
      .get<any>('https://hiremeplease.freeddns.org/division/all')
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
    const userUrl = `https://hiremeplease.freeddns.org/appuser/get/${this.selectedUserId}`;

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

      const summaryUrl = `https://hiremeplease.freeddns.org/assessmentsummary/achievementsummary/${this.selectedUserId}/${this.selectedYear}`;

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

      const summaryUrl = `https://hiremeplease.freeddns.org/assessmentsummary/attitudeskillsummary/${this.selectedUserId}/${this.selectedYear}`;

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
      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching Attitude Skill Summary for ${this.selectedYear} for User ID: ${this.selectedUserId}`
      );

      const summaryUrl =
        'https://hiremeplease.freeddns.org/empsuggestion/' +
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

    const url = 'https://hiremeplease.freeddns.org/assessmentsummary/sorch';

    const param = {
      ...(this.globalFilterValue ? { keyword: this.globalFilterValue } : {}),
      column: this.selectedOrderColumn,
      order: this.selectedOrderDirection,
      page: this.currentPage,
      pageSize: this.rowsPerPage,
      assessmentYear: this.selectedYear,
      ...(this.selectedDivisionIdFilter
        ? { divisionId: this.selectedDivisionIdFilter }
        : {}),
    };

    console.log('Sending Request to URL:', url, param);

    this.http
      .get<any>(url, { params: param })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.allSummaries = response.content || [];
          this.totalRecords = response.total_data;
          console.log('Fetched Assessment Summaries:', this.allSummaries);
          console.log('Response:', response);
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
  }

  resetViewAssessmentSummary(): void {
    this.achievements = [];
    this.attitudeSkills = [];
    this.suggestion = '';
    this.totalAchievementPercentage = 0;
    this.totalAttitudePercentage = 0;
    this.totalAchievementScore = 0;
    this.totalAttitudeScore = 0;
    this.selectedStatus = 0;
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

    this.totalAchievementPercentage = this.achievements.reduce(
      (sum, achievement) => sum + achievement.percentage,
      0
    );

    this.totalAttitudePercentage = this.attitudeSkills.reduce(
      (sum, skill) => sum + skill.percentage,
      0
    );

    this.totalPercentage =
      this.totalAchievementPercentage + this.totalAttitudePercentage;

    console.log(
      'New Total Achievement Percentage:',
      this.totalAchievementPercentage
    );
    console.log('New Total Attitude Percentage:', this.totalAttitudePercentage);
    console.log('New Combined Total Percentage:', this.totalPercentage);
  }

  get totalFinalScore(): number {
    this.totalAchievementScore = this.achievements.reduce(
      (sum, achievement) =>
        sum + (achievement.sum_score * achievement.percentage) / 100,
      0
    );

    this.totalAttitudeScore = this.attitudeSkills.reduce(
      (sum, skill) => sum + (skill.sum_score * skill.percentage) / 100,
      0
    );

    return this.totalAchievementScore + this.totalAttitudeScore;
  }

  async fetchViewAssessmentSummary(
    userId: string,
    summaryId: string
  ): Promise<void> {
    console.log('Fetching summaries for user: ', userId);
    this.displayAssessmentSummaryDialog = true;
    this.resetViewAssessmentSummary();
    try {
      this.selectedUserId = userId;
      this.selectedAssessmentSummaryId = summaryId;
      await Promise.all([
        this.fetchSelectedUserDetails(),
        this.fetchAchievementSummary(),
        this.fetchAttitudeSkillSummary(),
        this.fetchSuggestion(),
        this.checkAssessmentStatus(),
      ]);
      this.adjustPercentages();
      console.log('Assessment STatus:', this.selectedStatus);
    } catch (error) {
      console.error('Error fetching summaries:', error);

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch summaries.',
      });
    }
  }

  private searchTimeout: any;

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);

    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      console.log('Searching with:', this.globalFilterValue);
      this.fetchAssessmentSummaries();
    }, 500);
  }

  toggleOrderDirection(): void {
    this.selectedOrderDirection =
      this.selectedOrderDirection === 'asc' ? 'desc' : 'asc';
    console.log('Order direction toggled:', this.selectedOrderDirection);

    this.fetchAssessmentSummaries();
  }

  checkAssessmentStatus(): Promise<any> {
    const url = `https://hiremeplease.freeddns.org/assessmentsummary/get/${this.selectedUserId}/${this.selectedYear}`;

    return new Promise((resolve, reject) => {
      this.http.get<any>(url).subscribe({
        next: (response) => {
          this.selectedStatus = response.content?.status;
          console.log('Assessment status:', response.content?.status);
          resolve(response.content?.status || null);
        },
        error: (error) => {
          console.error('Error checking assessment status:', error);
          reject(null);
        },
      });
    });
  }

  approveAssessment(): void {
    this.isLoading = true;
    this.confirmationService.confirm({
      message: 'Are you sure? Once submitted, changes cannot be undone.',
      header: 'Confirm Submission',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('Submitting Assessment Summary...');

        const url =
          'https://hiremeplease.freeddns.org/assessmentsummary/update';

        const finalScore = this.decimal.transform(
          this.totalFinalScore,
          '1.2-2'
        );

        const payload = {
          id: this.selectedAssessmentSummaryId,
          user_id: this.selectedUserId,
          year: this.selectedYear,
          score: finalScore,
          status: 2,
          approved_by: this.currentUserId,
          updated_by: this.currentUserId,
          approved_at: new Date().toISOString(),
        };

        console.log('Payload:', payload);

        this.http
          .put(url, payload)
          .pipe(finalize(() => (this.isLoading = false)))
          .subscribe({
            next: (response) => {
              console.log('Assessment Summary submitted successfully.');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Assessment Summary has been approved successfully.',
              });
              this.fetchAssessmentSummaries();
              this.displayAssessmentSummaryDialog = false;
              this.isLoading = false;
            },
            error: (error) => {
              console.error('Error submitting Assessment Summary:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to approve Assessment Summary.',
              });
              this.isLoading = false;
              this.displayAssessmentSummaryDialog = false;
            },
          });
      },
      reject: () => {
        console.log('Submission canceled.');
        this.isLoading = false;
      },
    });
  }
}
