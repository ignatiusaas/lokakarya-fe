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
import {
  MessageService,
  PrimeNGConfig,
  PrimeTemplate,
  ConfirmationService,
} from 'primeng/api';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-assessment-summary',
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
  templateUrl: './assessment-summary.component.html',
  styleUrls: ['./assessment-summary.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class AssessmentSummaryComponent implements OnInit {
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
  selectedPosition: string = '';
  isLoading: boolean = true;
  empUrl: string = '';
  isExist: boolean = false;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.primengConfig.ripple = true;

    this.fetchSelectedUserDetails()
      .then(() => {
        if (
          this.currentRoles.includes('HR') ||
          this.currentRoles.includes('SVP') ||
          this.currentRoles.includes('MGR')
        ) {
          return Promise.all([
            this.fetchDivisions(),
            this.fetchEmployees(),
          ]).then(() => {
            return;
          });
        } else {
          this.selectedUserId = this.currentUserId;
          return Promise.resolve();
        }
      })
      .then(() => {
        return this.fetchAssessmentSummary();
      })
      .then(() => {
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Error while loading data:', error);
      });
  }

  async fetchEmployees(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.selectedDivisionId === '') {
        this.empUrl = 'https://hiremeplease.freeddns.org/appuser/all';
      } else {
        this.empUrl =
          'https://hiremeplease.freeddns.org/appuser/div/' +
          this.selectedDivisionId;
      }

      this.http.get<any>(this.empUrl).subscribe({
        next: (response) => {
          this.employees = response.content || [];
          console.log('Fetched Employees:', this.employees);
          resolve();
        },
        error: (error) => {
          console.error('Error fetching employees:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employees.',
          });
          reject(error);
        },
      });
    });
  }

  fetchDivisions(): void {
    this.http
      .get<any>('https://hiremeplease.freeddns.org/division/all')
      .subscribe({
        next: (response) => {
          this.divisions = response.content || [];
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

  checkAssessmentSummary(): void {
    const url = `https://hiremeplease.freeddns.org/assessmentsummary/get/${this.selectedUserId}/${this.selectedYear}`;
    this.http.get<any>(url).subscribe({
      next: (response) => {
        if (response.content !== null) {
          this.isExist = true;
        } else {
          this.isExist = false;
        }
        console.log('Fetched Summary:', response?.content);
      },
      error: (error) => {
        console.error('Error summary:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch summary.',
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
    if (!this.selectedUserId || this.selectedUserId === '') {
      console.warn('No user selected.');
      this.selectedUserId = this.currentUserId;
    }

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

  fetchAchievementSummary(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.selectedUserId) {
        console.warn('No user selected.');
        this.selectedUserId = this.currentUserId;
      }

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
      if (!this.selectedUserId) {
        console.warn('No user selected.');
        this.selectedUserId = this.currentUserId;
      }

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
      if (!this.selectedUserId) {
        console.warn('No user selected.');
        this.selectedUserId = this.currentUserId;
      }

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

  async fetchAssessmentSummary(): Promise<void> {
    try {
      this.resetAssessmentSummary();
      await Promise.all([
        this.fetchSelectedUserDetails(),
        this.fetchAchievementSummary(),
        this.fetchAttitudeSkillSummary(),
        this.fetchSuggestion(),
      ]);
      this.checkAssessmentSummary();
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

  resetAssessmentSummary(): void {
    this.achievements = [];
    this.attitudeSkills = [];
    this.totalAchievementPercentage = 0;
    this.totalAttitudePercentage = 0;
    this.totalPercentage = 0;
    this.totalAchievementScore = 0;
    this.totalAttitudeScore = 0;
  }

  async fetchAssessmentSummaryFirstEmployee(): Promise<void> {
    await this.fetchEmployees();
    this.selectedUserId = this.employees[0].id;
    await this.fetchAssessmentSummary();
  }

  submitAssessmentSummary(): void {
    this.isLoading = true;
    this.confirmationService.confirm({
      message: 'Are you sure? Once submitted, changes cannot be undone.',
      header: 'Confirm Submission',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('Submitting Assessment Summary...');
        this.createAssessmentSummary();
      },
      reject: () => {
        console.log('Submission canceled.');
        this.isLoading = false;
      },
    });
  }

  createAssessmentSummary(): void {
    const checkUrl = `https://hiremeplease.freeddns.org/assessmentsummary/get/${this.selectedUserId}/${this.selectedYear}`;
    const createUrl =
      'https://hiremeplease.freeddns.org/assessmentsummary/create';

    console.log(
      'Checking for existing Assessment Summary using URL:',
      checkUrl
    );

    this.http
      .get<any>(checkUrl)
      .pipe(
        switchMap((existingSummary) => {
          const fetchedSummary = existingSummary.content;
          console.log('Fetched Summary:', fetchedSummary);
          if (existingSummary && fetchedSummary?.id) {
            const updateUrl = `https://hiremeplease.freeddns.org/assessmentsummary/update`;

            const updateBody: any = {
              id: fetchedSummary.id,
              user_id: this.selectedUserId,
              year: this.selectedYear,
              score: this.totalFinalScore,
              status: this.selectedStatus,
              updated_by: this.currentUserId,
            };

            console.log('Existing Summary Found. Updating:', existingSummary);
            console.log('Update Body:', updateBody);

            return this.http.put<any>(updateUrl, updateBody).pipe(
              catchError((err) => {
                console.error('Error updating Assessment Summary:', err);
                let errorMessage = 'Failed to update assessment summary.';
                if (err.error && err.error.message) {
                  errorMessage = err.error.message;
                }
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: errorMessage,
                });
                this.isLoading = false;
                return of(null);
              })
            );
          } else {
            const requestBody: any = {
              user_id: this.selectedUserId,
              year: this.selectedYear,
              score: this.totalFinalScore,
              status: this.selectedStatus,
              created_by: this.currentUserId,
            };

            console.log('No Existing Summary Found. Creating:', requestBody);

            return this.http.post<any>(createUrl, requestBody).pipe(
              catchError((err) => {
                console.error('Error creating Assessment Summary:', err);
                let errorMessage = 'Failed to create assessment summary.';
                if (err.error && err.error.message) {
                  errorMessage = err.error.message;
                }
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: errorMessage,
                });
                this.isLoading = false;
                return of(null);
              })
            );
          }
        })
      )
      .subscribe({
        next: (response) => {
          if (response) {
            console.log('Assessment Summary successfully processed:', response);
          } else {
            console.log('No action was taken (possibly due to an error).');
          }
        },
        error: (error) => {
          console.error('Unhandled error:', error);
          this.isLoading = false;
        },
        complete: () => {
          console.log('Create Assessment Summary process complete.');
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Assessment Summary successfully submitted.',
          });
          this.isLoading = false;
        },
      });
  }
}
