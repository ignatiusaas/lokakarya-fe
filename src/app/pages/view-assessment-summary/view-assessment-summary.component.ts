import { DecimalPipe, NgForOf, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { jwtDecode } from 'jwt-decode';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
  PrimeTemplate,
} from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';

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
  private searchTimeout: any;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig,
    private confirmationService: ConfirmationService,
    private decimal: DecimalPipe,
    private cdRef: ChangeDetectorRef
  ) {}

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

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    if (
      (this.currentRoles.includes('MGR') ||
        this.currentRoles.includes('SVP')) &&
      !this.currentRoles.includes('HR')
    ) {
      this.selectedDivisionIdFilter = this.extractCurrentDivisionId() || '';
    }
    this.fetchDivisions();
  }

  fetchDivisions(): void {
    this.http.get<any>(environment.apiUrl + '/division/all').subscribe({
      next: (response) => {
        const all = { id: null, division_name: 'All' };
        const res = response.content || [];
        this.divisions = res.slice();
        this.divisions.unshift(all);
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

  fetchSelectedUserDetails(): Promise<void> {
    const userUrl = `${environment.apiUrl}/appuser/get/${this.selectedUserId}`;

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

  fetchAchievementSummary(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching Achievement Summary for ${this.selectedYear} for User ID: ${this.selectedUserId}`
      );

      const summaryUrl = `${environment.apiUrl}/assessmentsummary/achievementsummary/${this.selectedUserId}/${this.selectedYear}`;

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

      const summaryUrl = `${environment.apiUrl}/assessmentsummary/attitudeskillsummary/${this.selectedUserId}/${this.selectedYear}`;

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
        environment.apiUrl +
        '/empsuggestion/' +
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

    const url = environment.apiUrl + '/assessmentsummary/sorch';

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
      this.cdRef.detectChanges();
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
    const url = `${environment.apiUrl}/assessmentsummary/get/${this.selectedUserId}/${this.selectedYear}`;

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
      message: 'Are you sure? Once approved, changes cannot be undone.',
      header: 'Confirm Submission',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('Submitting Assessment Summary...');

        const url = environment.apiUrl + '/assessmentsummary/update';

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
            next: () => {
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

  exportAsPDF(): void {
    // Create a new jsPDF instance
    const doc = new jsPDF('p', 'pt', 'a4');

    // Title or heading for the PDF
    doc.text(
      `${this.selectedName}'s ${this.selectedYear} Assessment Summary`,
      40,
      40
    );

    // Build table data for Achievements
    const achievementsData = this.achievements.map((ach) => [
      ach.group_name,
      ach.sum_score,
      `${ach.percentage}%`,
      ((ach.sum_score * ach.percentage) / 100).toFixed(2),
    ]);

    // Add Achievements autoTable
    autoTable(doc, {
      startY: 60,
      head: [['Category', 'Score', 'Percentage', 'Final Score']],
      body: achievementsData,
      foot: [
        [
          { content: 'Total:', colSpan: 2, styles: { halign: 'right' } },
          `${this.totalAchievementPercentage.toFixed(2)}%`,
          this.totalAchievementScore.toFixed(2),
        ],
      ],
      margin: { left: 40, right: 40 },
    });

    // A little spacing
    let finalY = (doc as any).lastAutoTable.finalY + 20;

    // Build table data for Attitude Skills
    const attitudeData = this.attitudeSkills.map((att) => [
      att.group_name,
      att.sum_score,
      `${att.percentage}%`,
      ((att.sum_score * att.percentage) / 100).toFixed(2),
    ]);

    // Attitude Skills table
    autoTable(doc, {
      startY: finalY,
      head: [['Category', 'Score', 'Percentage', 'Final Score']],
      body: attitudeData,
      foot: [
        [
          { content: 'Total:', colSpan: 2, styles: { halign: 'right' } },
          `${this.totalAttitudePercentage.toFixed(2)}%`,
          this.totalAttitudeScore.toFixed(2),
        ],
      ],
      margin: { left: 40, right: 40 },
    });

    finalY = (doc as any).lastAutoTable.finalY + 20;

    // Final Score line
    autoTable(doc, {
      startY: finalY,
      body: [
        [
          {
            content: 'Total:',
            colSpan: 1,
            styles: { halign: 'right', fontStyle: 'bold' },
          },
          `${this.totalPercentage.toFixed(2)}%`,
          this.totalFinalScore.toFixed(2),
        ],
      ],
      margin: { left: 40, right: 40 },
      theme: 'plain',
    });

    finalY = (doc as any).lastAutoTable.finalY + 20;

    // Suggestion (if needed)
    if (this.suggestion) {
      autoTable(doc, {
        startY: finalY,
        body: [[`Suggestion: ${this.suggestion}`]],
        margin: { left: 40, right: 40 },
        theme: 'plain',
      });
    }

    doc.save(`AssessmentSummary_${this.selectedName}_${this.selectedYear}.pdf`);
  }

  exportAsExcel(): void {
    const workbook = XLSX.utils.book_new();

    const achievementSheetData = [
      ['Category', 'Score', 'Percentage', 'Final Score'],
      ...this.achievements.map((ach) => [
        ach.group_name,
        ach.sum_score,
        `${ach.percentage}%`,
        ((ach.sum_score * ach.percentage) / 100).toFixed(2),
      ]),
      [
        'Total:',
        '',
        `${this.totalAchievementPercentage.toFixed(2)}%`,
        this.totalAchievementScore.toFixed(2),
      ],
    ];

    const achievementSheet = XLSX.utils.aoa_to_sheet(achievementSheetData);
    XLSX.utils.book_append_sheet(workbook, achievementSheet, 'Achievements');

    const attitudeSheetData = [
      ['Category', 'Score', 'Percentage', 'Final Score'],
      ...this.attitudeSkills.map((skill) => [
        skill.group_name,
        skill.sum_score,
        `${skill.percentage}%`,
        ((skill.sum_score * skill.percentage) / 100).toFixed(2),
      ]),
      [
        'Total:',
        '',
        `${this.totalAttitudePercentage.toFixed(2)}%`,
        this.totalAttitudeScore.toFixed(2),
      ],
    ];

    const attitudeSheet = XLSX.utils.aoa_to_sheet(attitudeSheetData);
    XLSX.utils.book_append_sheet(workbook, attitudeSheet, 'AttitudeSkills');

    const suggestionSheetData = [
      ['Suggestion'],
      [this.suggestion || 'No suggestion data'],
    ];
    const suggestionSheet = XLSX.utils.aoa_to_sheet(suggestionSheetData);
    XLSX.utils.book_append_sheet(workbook, suggestionSheet, 'Suggestion');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(
      file,
      `AssessmentSummary_${this.selectedName}_${this.selectedYear}.xlsx`
    );
  }

  private extractCurrentUserId(): string | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in local storage.');
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

  private extractCurrentRoles(): any[] {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in local storage.');
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
      console.error('No JWT found in local storage.');
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
}
