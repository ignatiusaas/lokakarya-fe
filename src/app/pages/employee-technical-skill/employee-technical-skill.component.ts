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
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-employee-technical-skill',
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
  templateUrl: './employee-technical-skill.component.html',
  styleUrls: ['./employee-technical-skill.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class EmployeeTechnicalSkillComponent implements OnInit {
  empTechnicalSkills: any[] = [];
  loading: boolean = false;
  isProcessing: boolean = false;
  maxDate: Date = new Date();
  employees: any[] = [];
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  technicalSkills: any[] = [];
  selectedUserId: string = this.extractCurrentUserId() || '';
  selectedName: string = '';
  selectedAssessmentYear: Date = new Date();
  selectedYear: number = this.selectedAssessmentYear.getFullYear();
  groupedEmpTechnicalSkills: any[] = [];
  assessmentYear: Date | null = null;
  isLocked: boolean = false;

  scoreOptions: { label: string; value: number }[] = [
    { label: 'Starting', value: 10 },
    { label: 'Beginner', value: 20 },
    { label: 'Intermediate', value: 30 },
    { label: 'Advanced', value: 40 },
    { label: 'Professional', value: 50 },
  ];

  technicalSkillsMap: Map<string, string> = new Map();

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    console.log('Initializing EmployeeTechnicalSkillComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchSelectedUserName();

    if (this.currentRoles.includes('HR')) {
      this.fetchEmployees();
      this.selectedUserId = ''; // HR needs to select a user
    } else {
      this.selectedUserId = this.currentUserId;
    }

    // Fetch technical skills and employee technical skills, then group them
    Promise.all([this.fetchTechnicalSkills(), this.fetchEmpTechnicalSkills()])
      .then(() => {
        this.groupAllTechnicalSkills();
      })
      .catch((error) => {
        console.error('Error fetching initial data:', error);
      });

    console.log('Component Initialized');
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

  private initializeForm() {
    console.log('Initializing Edit Form...');
    this.editForm = this.fb.group({
      id: [''],
      user_id: [''],
      technical_skill_id: ['', Validators.required],
      entryScore: [null, Validators.required],
      skillEntry: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  onDialogClose(): void {
    console.log('Dialog closed without saving. Refetching data...');
    this.displayEditDialog = false;
    this.fetchEmpTechnicalSkills().then(() => {
      this.groupAllTechnicalSkills();
    });
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
    this.http
      .get<any>('https://hiremeplease.freeddns.org/appuser/all')
      .subscribe({
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

  fetchTechnicalSkills(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Fetching TechnicalSkills...');
      this.http
        .get<any>('https://hiremeplease.freeddns.org/technicalskill/all')
        .subscribe({
          next: (response) => {
            this.technicalSkills = (response.content || []).filter(
              (skill: any) => skill.enabled === true
            );
            console.log('Fetched TechnicalSkills:', this.technicalSkills);

            // Create a map for quick lookup
            this.technicalSkillsMap.clear();
            this.technicalSkills.forEach((skill: any) => {
              this.technicalSkillsMap.set(skill.id, skill.technical_skill);
            });

            resolve();
          },
          error: (error) => {
            console.error('Error fetching technical skills:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch technical skills.',
            });
            reject(error);
          },
        });
    });
  }

  fetchEmpTechnicalSkills(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.selectedUserId) {
        console.warn('No user selected.');
        this.selectedUserId = this.currentUserId;
      }

      this.fetchSelectedUserName();
      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching ${this.selectedYear} EmpTechnicalSkills for User ID: ${this.selectedUserId}`
      );

      this.loading = true;

      const skillUrl = `https://hiremeplease.freeddns.org/emptechnicalskill/get/${this.selectedUserId}/${this.selectedYear}`;

      console.log('Fetching EmpTechnicalSkills from URL:', skillUrl);

      this.http
        .get<any>(skillUrl)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.empTechnicalSkills = response.content || [];
            console.log('Fetched EmpTechnicalSkills:', this.empTechnicalSkills);

            // Group the technical skills after fetching data
            this.groupAllTechnicalSkills();

            const summaryUrl = `https://hiremeplease.freeddns.org/assessmentsummary/get/${this.selectedUserId}/${this.selectedYear}`;
            this.http.get<any>(summaryUrl).subscribe({
              next: (summaryResponse) => {
                this.isLocked = summaryResponse?.content?.status === 2;
                console.log('Assessment summary locked status:', this.isLocked);
              },
              error: (err) => {
                console.error('Error fetching assessment summary:', err);
              },
            });

            resolve();
          },
          error: (error) => {
            console.error('Error Fetching Employee TechnicalSkills:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch employee skills.',
            });
            reject(error);
          },
        });
    });
  }

  private groupAllTechnicalSkills(includeAll: boolean = false): void {
    const grouped = new Map<string, any>();

    this.technicalSkills.forEach((techSkill) => {
      grouped.set(techSkill.id, {
        technical_skill_id: techSkill.id,
        technical_skill_name: techSkill.technical_skill,
        skillEntrys: [],
      });
    });

    this.empTechnicalSkills.forEach((empSkill) => {
      const techSkillId = empSkill.technical_skill_id;
      const group = grouped.get(techSkillId);
      if (group) {
        group.skillEntrys.push({
          id: empSkill.id,
          skillEntry: empSkill.skill,
          entryScore: empSkill.score,
        });
      } else {
        console.warn(
          `Technical Skill ID ${techSkillId} not found for employee skill ${empSkill.id}`
        );
      }
    });

    this.groupedEmpTechnicalSkills = Array.from(grouped.values());
  }

  openEditDialog(): void {
    console.log('Opening Technical Skill Edit Form');
    this.displayEditDialog = true;
    this.isProcessing = false;
    this.assessmentYear = this.selectedAssessmentYear;

    this.fetchEmpTechnicalSkills().then(() => {
      this.groupAllTechnicalSkills(true);
      this.groupedEmpTechnicalSkills.forEach((group) => {
        if (group.skillEntrys.length === 0) {
          group.skillEntrys.push({
            id: this.generateUniqueId(),
            skillEntry: '',
            entryScore: null,
          });
        }
      });
    });
  }

  async saveEmployeeTechnicalSkill(): Promise<void> {
    console.log('Saving Employee Technical Skills.');
    this.isProcessing = true;

    const requests: Promise<any>[] = [];

    for (const group of this.groupedEmpTechnicalSkills) {
      for (const entry of group.skillEntrys) {
        if (!entry.skillEntry || !entry.entryScore) {
          console.warn('Skipping incomplete entry:', entry);
          continue;
        }

        const payload: any = {
          user_id: this.selectedUserId || this.currentUserId,
          technical_skill_id: group.technical_skill_id,
          assessment_year: this.selectedYear,
          skill: entry.skillEntry,
          score: entry.entryScore,
        };

        console.log('Payload:', payload);

        if (entry.id && !entry.id.startsWith('new_')) {
          payload['id'] = entry.id;
          payload['updated_by'] = this.currentUserId;
          requests.push(
            this.http
              .put(
                'https://hiremeplease.freeddns.org/emptechnicalskill/update',
                payload
              )
              .toPromise()
          );
        } else {
          // Create new entry
          payload['created_by'] = this.currentUserId;
          requests.push(
            this.http
              .post(
                'https://hiremeplease.freeddns.org/emptechnicalskill/create',
                payload
              )
              .toPromise()
          );
        }
      }
    }

    try {
      await Promise.all(requests);
      console.log(`Employee Technical Skills saved successfully.`);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Employee Technical Skills saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving employee technical skills:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save employee technical skills.',
      });
    } finally {
      this.isProcessing = false;
      this.displayEditDialog = false;
      this.fetchEmpTechnicalSkills().then(() => this.groupAllTechnicalSkills());
    }
  }

  submitEmployeeTechnicalSkill(): void {
    this.isProcessing = true;
    this.confirmationService.confirm({
      message: 'Are you sure? Once approved, changes cannot be undone',
      header: 'Confirm Submission',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('Submitting Employee Technical Skills.');
        this.saveEmployeeTechnicalSkill();
      },
      reject: () => {
        console.log('Submission canceled.');
        this.isProcessing = false;
      },
    });
  }

  getScoreLabel(scoreValue: number | null | undefined): string {
    if (scoreValue == null) {
      return '';
    }
    const scoreOption = this.scoreOptions.find(
      (option) => option.value === scoreValue
    );
    return scoreOption ? scoreOption.label : scoreValue.toString();
  }

  addSkillEntry(group: any): void {
    group.skillEntrys.push({
      id: this.generateUniqueId(),
      skillEntry: '',
      entryScore: null,
      isCompleted: false,
    });
  }

  removeSkillEntry(group: any, index: number): void {
    group.skillEntrys.splice(index, 1);
  }

  generateUniqueId(): string {
    return 'new_' + Math.random().toString(36).substr(2, 9);
  }

  trackByTechnicalSkillId(index: number, entry: any): string {
    return entry.technical_skill_id;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
