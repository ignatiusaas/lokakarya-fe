import { Component, OnInit } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
  PrimeTemplate,
} from 'primeng/api';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

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
    PrimeTemplate,
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
  isExist: boolean = false;

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
    console.log('Initializing EmployeeAttitudeSkillComponent');
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
    console.log('Component Initialized');
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
        console.log('Decoded userId:', decoded.divisionId);
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

  private extractCurrentRoles(): any | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.roles) {
        console.log('Decoded roles:', decoded.roles);
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
    console.log('Initializing Edit Form...');
    this.editForm = this.fb.group({
      id: [''],
      user_id: [''],
      attitude_skill_id: ['', Validators.required],
      entryScore: [null, Validators.required],
      skillEntry: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  fetchSelectedUserName(): void {
    if (!this.selectedUserId || this.selectedUserId === '') {
      console.warn('No user selected.');
      this.selectedUserId = this.currentUserId;
    }
    const userUrl = `https://hiremeplease.freeddns.org/appuser/get/${this.selectedUserId}`;

    this.http.get<any>(userUrl).subscribe({
      next: (response) => {
        const user = response.content;
        if (user && user.full_name) {
          this.selectedName = user.full_name;
          console.log('Fetched User Full Name:', this.selectedName);
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
    if (this.currentRoles.includes('HR') || this.currentRoles.includes('SVP')) {
      this.empUrl = 'https://hiremeplease.freeddns.org/appuser/all';
    } else {
      this.empUrl =
        'https://hiremeplease.freeddns.org/appuser/div/' +
        this.currentDivisionId;
    }
    console.log('Fetching employees from URL:', this.empUrl);
    this.http.get<any>(this.empUrl).subscribe({
      next: (response) => {
        this.employees = response.content || [];
        console.log('Fetched Employees:', this.employees);
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

    console.log(
      `Fetching ${this.selectedYear} EmpAttitudeSkills for User ID: ${this.selectedUserId}`
    );

    this.loading = true; // Show the spinner

    const skillUrl = `https://hiremeplease.freeddns.org/empattitudeskill/get/${this.selectedUserId}/${this.selectedYear}`;

    this.http
      .get<any>(skillUrl)
      .pipe(finalize(() => (this.loading = false))) // Hide spinner after loading
      .subscribe({
        next: (response) => {
          if (response.content.length > 0) {
            this.isExist = true;
          } else {
            this.isExist = false;
          }
          this.empAttitudeSkills = response.content || [];
          console.log('Fetched EmpAttitudeSkills:', this.empAttitudeSkills);

          this.groupAllAttitudeSkills();
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

  applyFiltersAndPagination(event?: any): void {
    const startIndex = event?.first || 0;
    const endIndex = startIndex + this.rowsPerPage;

    // Apply global filtering (search)
    let filteredAttitudeSkills = this.globalFilterValue
      ? this.allEmpAttitudeSkills.filter((empAttitudeSkill) =>
          Object.values(empAttitudeSkill).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allEmpAttitudeSkills];

    if (this.showOnlyMine) {
      filteredAttitudeSkills = filteredAttitudeSkills.filter(
        (skill) => skill.user_id === this.currentUserId
      );
    }

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredAttitudeSkills.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    // Apply pagination
    this.empAttitudeSkills = filteredAttitudeSkills.slice(startIndex, endIndex);

    // Update totalRecords for pagination
    this.totalRecords = filteredAttitudeSkills.length;
  }

  editEmpAttitudeSkill(skillId: string): void {
    console.log('Editing Employee AttitudeSkill with ID:', skillId);
    this.isEditFormLoading = true;
    this.isProcessing = true;

    this.http
      .get<any>(`https://hiremeplease.freeddns.org/empattitudeskill/${skillId}`)
      .pipe(
        finalize(() => {
          this.isProcessing = false;
          this.isEditFormLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          const empAttitudeSkill = response.content;
          console.log('Fetched Employee AttitudeSkill:', empAttitudeSkill);

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
    console.log('Saving Employee Attitude Skills.');

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
              .put(
                'https://hiremeplease.freeddns.org/empattitudeskill/update',
                payload
              )
              .toPromise()
          );
        } else {
          payload['created_by'] = this.currentUserId;
          requests.push(
            this.http
              .post(
                'https://hiremeplease.freeddns.org/empattitudeskill/create',
                payload
              )
              .toPromise()
          );
        }
        this.isExist = true;
      }
    }

    try {
      await Promise.all(requests);
      console.log(`Employee Attitude Skills saved successfully.`);
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
    console.log('Updating Employee AttitudeSkill.');

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

    console.log('Submitting Update Payload:', payload);

    try {
      await this.http
        .put(
          'https://hiremeplease.freeddns.org/empattitudeskill/update',
          payload
        )
        .toPromise();

      console.log(`Skill "${entry.attitude_skill_name}" updated successfully.`);
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

  resetSortAndFilter(): void {
    console.log('Resetting sort and filter...');

    this.globalFilterValue = '';

    const dt = document.querySelector('p-table') as any;
    if (dt) {
      dt.sortField = null;
      dt.sortOrder = null;
    }

    this.applyFiltersAndPagination({ first: 0 });
  }

  openEditDialog(): void {
    console.log('Opening Attitude Skill Edit Form');
    this.editForm.reset();
    this.displayEditDialog = true;
    this.isProcessing = false;
    this.assessmentYear = this.selectedAssessmentYear;

    this.fetchEmpAttitudeSkills();
  }

  submitEmployeeAttitudeSkill(): void {
    this.isProcessing = true;
    this.confirmationService.confirm({
      message: 'Are you sure? Once submitted, changes cannot be undone.',
      header: 'Confirm Submission',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('Submitting Employee Attitude Skills.');
        this.saveEmployeeAttitudeSkill();
      },
      reject: () => {
        this.isProcessing = false;
        console.log('Form submission cancelled.');
      },
    });
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
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
      this.http
        .get<any>('https://hiremeplease.freeddns.org/attitudeskill/all')
        .subscribe({
          next: (response) => {
            this.attitudeSkills = (response.content || []).filter(
              (skill: any) => skill.enabled === true
            );
            console.log('Fetched AttitudeSkills:', this.attitudeSkills);

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
        .get<any>('https://hiremeplease.freeddns.org/groupattitudeskill/all')
        .subscribe({
          next: (response) => {
            this.groupAttitudeSkills = response.content || [];
            console.log(
              'Fetched Group AttitudeSkills:',
              this.groupAttitudeSkills
            );

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

    console.log('Grouped AttitudeSkills:', grouped);

    // Convert grouped data into an array for display
    this.groupedEmpAttitudeSkills = Array.from(grouped.values());
    console.log('Grouped: ', this.groupedEmpAttitudeSkills);
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
}
