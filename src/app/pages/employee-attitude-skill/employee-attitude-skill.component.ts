import { NgForOf, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
} from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';

@Component({
  selector: 'app-employee-attitude-skill',
  standalone: true,
  imports: [
    ButtonDirective,
    CalendarModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    InputSwitchModule,
    InputTextModule,
    NgForOf,
    NgIf,
    RadioButtonModule,
    ReactiveFormsModule,
    TableModule,
    ToastModule,
    PrimeNgModule,
    NavbarComponent,
  ],
  templateUrl: './employee-attitude-skill.component.html',
  styleUrl: './employee-attitude-skill.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class EmployeeAttitudeSkillComponent implements OnInit {
  empAttitudeSkills: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  maxDate: Date = new Date();
  employees: any[] = [];
  roles: any[] = [];
  selectedRoles: { [roleId: string]: boolean } = {};
  currentUserId: string = this.extractCurrentUserId() || '';
  currentDivisionId: string = this.extractCurrentDivisionId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  allEmpAttitudeSkills: any[] = [];
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  showOnlyMine: boolean = false;
  attitudeSkills: any[] = [];
  selectedUserId: string = this.extractCurrentUserId() || '';
  selectedName: string = '';
  selectedAssessmentYear: Date = new Date();
  selectedYear: number = this.selectedAssessmentYear.getFullYear();
  empUrl: string = '';
  isLocked: boolean = false;

  groupedEmpAttitudeSkills: any[] = []; // For grouped data

  attitudeSkillEntries: {
    attitude_skill_id: string;
    attitude_skill_name: string;
    skillEntrys: { id: string; value: string }[];
    entryScores: { id: string; value: number | null }[];
  }[] = [];

  assessmentYear: Date | null = null;

  scoreOptions: { label: string; value: number }[] = [
    { label: 'Bad', value: 10 },
    { label: 'Average', value: 20 },
    { label: 'Good', value: 30 },
    { label: 'Great', value: 40 },
    { label: 'Excellent', value: 50 },
  ];

  attitudeSkillsMap: Map<string, string> = new Map();
  groupAttitudeSkillsMap: Map<string, string> = new Map();

  groupAttitudeSkills: any[] = [];

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.primengConfig.ripple = true;

    this.initializeForm();

    // Fetch attitude skills and group attitude skills first
    Promise.all([this.fetchAttitudeSkills(), this.fetchGroupAttitudeSkills()])
      .then(() => {
        // Now fetch employee attitude skills
        this.fetchEmpAttitudeSkills();
      })
      .catch((error) => {
        console.error('Error fetching initial data:', error);
      });

    this.fetchSelectedUserName();
    if (
      this.currentRoles.includes('HR') ||
      this.currentRoles.includes('SVP') ||
      this.currentRoles.includes('MGR')
    ) {
      this.fetchEmployees();
      this.selectedUserId = '';
    } else {
      this.selectedUserId = this.currentUserId;
    }
    this.selectedAssessmentYear = new Date();
  }

  fetchSelectedUserName(): void {
    if (!this.selectedUserId || this.selectedUserId === '') {
      console.warn('No user selected.');
      this.selectedUserId = this.currentUserId;
    }
    const userUrl = `${environment.apiUrl}/appuser/get/${this.selectedUserId}`;

    this.http.get<any>(userUrl).subscribe({
      next: (response) => {
        const user = response.content;
        if (user && user.full_name) {
          this.selectedName = user.full_name;
        } else {
          console.warn('User full name not found in response.');
          this.selectedName = '';
        }
      },
      error: (error) => {
        console.error('Error fetching user full name:', error);
        this.selectedName = '';
      },
    });
  }

  fetchEmployees(): void {
    if (this.currentRoles.includes('HR')) {
      this.empUrl = environment.apiUrl + '/appuser/all';
    } else {
      this.empUrl =
        environment.apiUrl + '/appuser/div/' + this.currentDivisionId;
    }
    this.http.get<any>(this.empUrl).subscribe({
      next: (response) => {
        this.employees = [];
        const allEmployees = response.content || [];
        allEmployees.forEach((employee: any) => {
          if (employee.enabled) {
            this.employees.push(employee);
          }
        });
      },

      error: (error) => {
        console.error('Error fetching employees:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch employees.',
        });
      },
    });
  }

  fetchEmpAttitudeSkills(): void {
    this.fetchSelectedUserName();
    this.selectedYear = this.selectedAssessmentYear.getFullYear();

    this.loading = true; // Show the spinner

    const skillUrl = `${environment.apiUrl}/empattitudeskill/get/${this.selectedUserId}/${this.selectedYear}`;

    this.http
      .get<any>(skillUrl)
      .pipe(finalize(() => (this.loading = false))) // Hide spinner after loading
      .subscribe({
        next: (response) => {
          this.empAttitudeSkills = response.content || [];
          this.groupAllAttitudeSkills();
          const summaryUrl = `${environment.apiUrl}/assessmentsummary/get/${this.selectedUserId}/${this.selectedYear}`;
          this.http.get<any>(summaryUrl).subscribe({
            next: (summaryResponse) => {
              this.isLocked = summaryResponse?.content?.status === 2;
            },
            error: (err) => {
              console.error('Error fetching assessment summary:', err);
            },
          });
        },
        error: (error) => {
          console.error('Error Fetching Employee AttitudeSkills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee skills.',
          });
        },
      });
  }

  editEmpAttitudeSkill(skillId: string): void {
    this.isEditFormLoading = true;
    this.isProcessing = true;

    this.http
      .get<any>(`${environment.apiUrl}/empattitudeskill/${skillId}`)
      .pipe(
        finalize(() => {
          this.isProcessing = false;
          this.isEditFormLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          const empAttitudeSkill = response.content;
          this.attitudeSkillEntries = [
            {
              attitude_skill_id: empAttitudeSkill.attitude_skill_id,
              attitude_skill_name: empAttitudeSkill.attitude_skill,
              skillEntrys: [
                {
                  id: empAttitudeSkill.id,
                  value: empAttitudeSkill.notes,
                },
              ],
              entryScores: [
                {
                  id: this.generateUniqueId(),
                  value: empAttitudeSkill.score,
                },
              ],
            },
          ];

          // Set the assessment year
          this.assessmentYear = new Date(
            empAttitudeSkill.assessment_year,
            0,
            1
          );

          this.displayEditDialog = true;
        },
        error: (error) => {
          console.error('Error Fetching Employee AttitudeSkill:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee skill details.',
          });
        },
      });
  }

  async saveEmployeeAttitudeSkill(): Promise<void> {
    this.isProcessing = true;

    const requests: Promise<any>[] = [];

    for (const group of this.groupedEmpAttitudeSkills) {
      for (const attitudeSkill of group.attitudeSkills) {
        if (attitudeSkill.score == null || attitudeSkill.score === undefined) {
          continue;
        }

        const payload: any = {
          user_id: this.selectedUserId || this.currentUserId,
          attitude_skill_id: attitudeSkill.attitude_skill_id,
          assessment_year: this.selectedYear,
          score: attitudeSkill.score,
        };

        if (attitudeSkill.emp_skill_id) {
          payload['id'] = attitudeSkill.emp_skill_id;
          payload['updated_by'] = this.currentUserId;
          requests.push(
            this.http
              .put(environment.apiUrl + '/empattitudeskill/update', payload)
              .toPromise()
          );
        } else {
          payload['created_by'] = this.currentUserId;
          requests.push(
            this.http
              .post(environment.apiUrl + '/empattitudeskill/create', payload)
              .toPromise()
          );
        }
      }
    }

    try {
      await Promise.all(requests);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Employee Attitude Skills saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving employee attitude skills:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save employee attitude skills.',
      });
    } finally {
      this.isProcessing = false;
      this.displayEditDialog = false;
      this.fetchEmpAttitudeSkills();
    }
  }

  async updateEmployeeAttitudeSkill(): Promise<void> {
    const entry = this.attitudeSkillEntries[0];
    const skillEntry = entry.skillEntrys[0];
    const scoreEntry = entry.entryScores[0];

    if (!skillEntry || skillEntry.value.trim() === '') {
      console.error('Skill entry is missing.');
      this.isProcessing = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Skill entry is required.',
      });
      return;
    }

    if (scoreEntry.value == null || scoreEntry.value === undefined) {
      console.error('Score is missing for the skill entry.');
      this.isProcessing = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a score for the skill entry.',
      });
      return;
    }

    const payload = {
      id: skillEntry.id,
      user_id: this.currentUserId,
      attitude_skill_id: entry.attitude_skill_id,
      assessment_year: this.selectedYear,
      notes: skillEntry.value,
      score: scoreEntry.value,
      updated_by: this.currentUserId,
    };

    try {
      await this.http
        .put(environment.apiUrl + '/empattitudeskill/update', payload)
        .toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Skill "${entry.attitude_skill_name}" updated successfully.`,
      });
    } catch (error) {
      console.error(
        `Error updating skill "${entry.attitude_skill_name}":`,
        error
      );
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to update skill "${entry.attitude_skill_name}".`,
      });
    } finally {
      this.isProcessing = false;
      this.displayEditDialog = false;
      this.fetchEmpAttitudeSkills();
    }
  }

  openEditDialog(): void {
    this.editForm.reset();
    this.displayEditDialog = true;
    this.isProcessing = false;
    this.assessmentYear = this.selectedAssessmentYear;

    this.fetchEmpAttitudeSkills();
  }

  submitEmployeeAttitudeSkill(): void {
    this.isProcessing = true;
    this.confirmationService.confirm({
      message: 'Are you sure? Once approved, changes cannot be undone.',
      header: 'Confirm Submission',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.saveEmployeeAttitudeSkill();
      },
      reject: () => {
        this.isProcessing = false;
      },
    });
  }

  getScoreLabel(scoreValue: number | null | undefined): string {
    if (scoreValue == null) {
      return ''; // Or return a default message like 'No Score'
    }
    const scoreOption = this.scoreOptions.find(
      (option) => option.value === scoreValue
    );
    return scoreOption ? scoreOption.label : scoreValue.toString();
  }

  // Fetch attitude skills
  fetchAttitudeSkills(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<any>(environment.apiUrl + '/attitudeskill/all').subscribe({
        next: (response) => {
          this.attitudeSkills = (response.content || []).filter(
            (skill: any) => skill.enabled === true
          );
          resolve();
        },
        error: (error) => {
          console.error('Error fetching attitude skills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch attitude skills.',
          });
          reject(error);
        },
      });
    });
  }

  // Fetch group attitude skills
  fetchGroupAttitudeSkills(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .get<any>(environment.apiUrl + '/groupattitudeskill/all')
        .subscribe({
          next: (response) => {
            this.groupAttitudeSkills = response.content || [];
            resolve();
          },
          error: (error) => {
            console.error('Error fetching group attitude skills:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch group attitude skills.',
            });
            reject(error);
          },
        });
    });
  }

  prepareAttitudeSkillEntries(): void {
    const grouped = new Map<string, any>();

    // Initialize groups
    this.groupAttitudeSkills.forEach((group) => {
      grouped.set(group.id, {
        group_id: group.id,
        group_name: group.group_name,
        attitudeSkills: [],
      });
    });

    // Add attitude skills to their respective groups
    this.attitudeSkills.forEach((attSkill) => {
      const groupId = attSkill.group_id;
      if (grouped.has(groupId)) {
        grouped.get(groupId).attitudeSkills.push({
          attitude_skill_id: attSkill.id,
          attitude_skill_name: attSkill.attitude_skill,
          score: null,
        });
      } else {
        // Handle attitude skills without a group (optional)
        console.warn(
          `Group ID ${groupId} not found for attitude skill ${attSkill.id}`
        );
      }
    });

    // Merge employee data
    this.empAttitudeSkills.forEach((empSkill) => {
      const groupId = empSkill.group_id;
      const attitudeSkillId = empSkill.attitude_skill_id;

      const group = grouped.get(groupId);
      if (group) {
        const attitudeSkill = group.attitudeSkills.find(
          (as: any) => as.attitude_skill_id === attitudeSkillId
        );
        if (attitudeSkill) {
          attitudeSkill.score = empSkill.score;
          attitudeSkill.emp_skill_id = empSkill.id; // Store the employee skill ID for updates
        }
      }
    });

    // Convert to array
    this.attitudeSkillEntries = Array.from(grouped.values());
  }

  addSkillEntry(entry: any): void {
    entry.skillEntrys.push({ id: this.generateUniqueId(), value: '' });
    entry.entryScores.push({ id: this.generateUniqueId(), value: null });
  }

  generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  removeSkillEntry(entry: any, index: number): void {
    if (entry.skillEntrys.length > 1) {
      entry.skillEntrys.splice(index, 1);
      entry.entryScores.splice(index, 1);
    }
  }

  trackByAttitudeSkillId(index: number, entry: any): string {
    return entry.attitude_skill_id;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  trackById(index: number, item: { id: string }): string {
    return item.id;
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

  private extractCurrentUserId(): string | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in local storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.userId) {
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

  private extractCurrentRoles(): any | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in local storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.roles) {
        return decoded.roles;
      } else {
        console.error('roles not found in JWT.');
        return null;
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  private initializeForm() {
    this.editForm = this.fb.group({
      id: [''],
      user_id: [''],
      attitude_skill_id: ['', Validators.required],
      entryScore: [null, Validators.required],
      skillEntry: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';
  }

  private groupAllAttitudeSkills(): void {
    const grouped = new Map<string, any>();

    // Initialize groups
    this.groupAttitudeSkills.forEach((group) => {
      grouped.set(group.id, {
        group_id: group.id,
        group_name: group.group_name,
        attitudeSkills: [],
      });
    });

    // Add attitude skills to their respective groups
    this.attitudeSkills.forEach((attSkill) => {
      const groupId = attSkill.group_id;
      if (grouped.has(groupId)) {
        grouped.get(groupId).attitudeSkills.push({
          attitude_skill_id: attSkill.id,
          attitude_skill_name: attSkill.attitude_skill,
          score: null, // Default null score
          emp_skill_id: null, // For updating purposes
        });
      } else {
        // Optionally handle attitude skills without a group
        console.warn(
          `Group ID ${groupId} not found for attitude skill ${attSkill.id}`
        );
      }
    });

    // Merge employee data
    this.empAttitudeSkills.forEach((empSkill) => {
      const groupId = empSkill.group_id;
      const attSkillId = empSkill.attitude_skill_id;

      const group = grouped.get(groupId);
      if (group) {
        const attitudeSkill = group.attitudeSkills.find(
          (as: any) => as.attitude_skill_id === attSkillId
        );
        if (attitudeSkill) {
          attitudeSkill.score = empSkill.score ?? null;
          attitudeSkill.emp_skill_id = empSkill.id ?? null; // For updating purposes
        }
      }
    });

    // Convert grouped data into an array for display
    this.groupedEmpAttitudeSkills = Array.from(grouped.values());
  }
}
